import type { JSONContent, SceneDoc } from '@/core/json'
import type { Project } from '@/core/types'
import { compileUnits, escapeHtml, SCREENPLAY_INDENT_IN } from '@/core/compile'
import { hasCustomTitle, slug, textOf } from '@/core/stats'
import { saveExport } from '@/core/fileio'

const inches = (n: number) => Math.round(n * 1440)
const FONT = 'Courier Prime'
// docx defaults to A4; screenplays (and the editor/PDF) are US Letter, 1in margins.
const LETTER_TWIP = { width: 12240, height: 15840 }
const PAGE_MARGIN_TWIP = 1440

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

type Docx = typeof import('docx')

function cleanFontName(font?: string, fallback = 'EB Garamond'): string {
  if (!font) return fallback
  const first = font.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '')
  return first || fallback
}

/** One TextRun per inline node; a soft break becomes a run break. */
function screenplayRuns(docx: Docx, node: JSONContent, fontName = FONT, bold = false, italics = false) {
  const parts = (node.content ?? []).flatMap((c) =>
    c.type === 'hard_break'
      ? [new docx.TextRun({ break: 1 })]
      : [new docx.TextRun({ text: c.text ?? '', bold, italics, font: fontName, size: 24 })],
  )
  return parts.length ? parts : [new docx.TextRun({ text: '', bold, italics, font: fontName, size: 24 })]
}

function screenplayParagraph(docx: Docx, node: JSONContent, elementFonts?: Record<string, string>) {
  const type = node.type ?? 'action'
  const font = cleanFontName(elementFonts?.[type], FONT)
  switch (type) {
    case 'scene_heading':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, true),
        indent: { left: inches(SCREENPLAY_INDENT_IN.sceneHeading) },
        spacing: { before: 240, after: 240 },
      })
    case 'character':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, true),
        indent: { left: inches(SCREENPLAY_INDENT_IN.character) },
        spacing: { before: 240 },
      })
    case 'parenthetical':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, false, true),
        indent: { left: inches(SCREENPLAY_INDENT_IN.parenthetical), right: inches(1) },
      })
    case 'dialogue':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font),
        indent: { left: inches(SCREENPLAY_INDENT_IN.dialogueLeft), right: inches(SCREENPLAY_INDENT_IN.dialogueRight) },
        spacing: { after: 120 },
      })
    case 'transition':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, true),
        alignment: docx.AlignmentType.RIGHT,
        spacing: { before: 240, after: 240 },
      })
    case 'shot':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, true),
        indent: { left: inches(SCREENPLAY_INDENT_IN.shot) },
        spacing: { before: 240, after: 240 },
      })
    default:
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font),
        indent: { left: inches(SCREENPLAY_INDENT_IN.action) },
        spacing: { before: 240, after: 240 },
      })
  }
}

function proseParagraph(
  docx: Docx,
  node: JSONContent,
  bodyFont: string,
  headingFont: string,
  fontSizePt: number,
  justify = true,
  indent = true,
) {
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level ?? 2)
    const headingSize = level <= 1 ? (fontSizePt + 4) * 2 : (fontSizePt + 2) * 2
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: textOf(node, '').toUpperCase(),
          bold: true,
          size: headingSize,
          font: headingFont,
        }),
      ],
      alignment: docx.AlignmentType.CENTER,
      spacing: { before: 720, after: 360 },
    })
  }

  if (node.type === 'blockquote') {
    const runs = (node.content ?? []).flatMap((c) => {
      if (c.type === 'hard_break') return [new docx.TextRun({ break: 1 })]
      const marks = c.marks?.map((m) => m.type) ?? []
      return [
        new docx.TextRun({
          text: c.text ?? '',
          bold: marks.includes('strong'),
          italics: true,
          font: bodyFont,
          size: fontSizePt * 2,
        }),
      ]
    })
    return new docx.Paragraph({
      children: runs.length ? runs : [new docx.TextRun('')],
      alignment: justify ? docx.AlignmentType.JUSTIFIED : undefined,
      indent: { left: 720, right: 720 },
      spacing: { before: 180, after: 180 },
    })
  }

  const runs = (node.content ?? []).flatMap((c) => {
    if (c.type === 'hard_break') return [new docx.TextRun({ break: 1 })]
    const marks = c.marks?.map((m) => m.type) ?? []
    return [
      new docx.TextRun({
        text: c.text ?? '',
        bold: marks.includes('strong'),
        italics: marks.includes('em'),
        font: bodyFont,
        size: fontSizePt * 2,
      }),
    ]
  })

  return new docx.Paragraph({
    children: runs.length ? runs : [new docx.TextRun('')],
    alignment: justify ? docx.AlignmentType.JUSTIFIED : undefined,
    indent: indent ? { firstLine: 420 } : undefined,
    spacing: {
      line: 360,
      lineRule: docx.LineRuleType.AUTO,
      after: indent ? 0 : 120,
    },
  })
}

export async function exportDocx(project: Project, scenes: Record<string, SceneDoc>): Promise<void> {
  const docx = await import('docx')
  const units = compileUnits(project, scenes)
  const tp = project.settings.titlePage
  const children = []

  const customTitle = hasCustomTitle(project.title)

  const bodyFont = cleanFontName(
    project.settings.elementFonts?.paragraph || project.settings.fontFamily,
    project.mode === 'screenplay' ? 'Courier Prime' : 'EB Garamond',
  )
  const headingFont = cleanFontName(
    project.settings.elementFonts?.heading,
    bodyFont,
  )
  const fontSizePt = project.settings.fontSizePt || 12

  if (tp?.title || tp?.author || (customTitle && project.settings.author)) {
    children.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: tp?.title ?? (customTitle ? project.title : ''),
            bold: true,
            size: 36,
            font: headingFont,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 2880, after: 720 },
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: project.settings.author || tp?.author || '',
            size: 24,
            font: bodyFont,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 1440 },
      }),
    )
    if (tp?.contact) {
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: tp.contact,
              size: 20,
              font: bodyFont,
            }),
          ],
          alignment: docx.AlignmentType.CENTER,
        }),
      )
    }
    children.push(new docx.Paragraph({ children: [new docx.PageBreak()] }))
  } else if (customTitle && !tp?.title) {
    children.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: project.title,
            bold: true,
            size: 32,
            font: headingFont,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 720, after: 480 },
      }),
    )
  }

  for (const u of units) {
    if (u.kind === 'heading') {
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: project.mode === 'novel' ? u.text.toUpperCase() : u.text,
              bold: true,
              size: project.mode === 'novel' ? 30 : 28,
              font: headingFont,
            }),
          ],
          alignment: project.mode === 'novel' ? docx.AlignmentType.CENTER : docx.AlignmentType.LEFT,
          spacing: { before: 720, after: 360 },
        }),
      )
      continue
    }
    for (const n of u.doc.content) {
      children.push(
        project.mode === 'screenplay'
          ? screenplayParagraph(docx, n, project.settings.elementFonts)
          : proseParagraph(
              docx,
              n,
              bodyFont,
              headingFont,
              fontSizePt,
              project.settings.justify ?? true,
              project.settings.indent ?? true,
            ),
      )
    }
  }

  const doc = new docx.Document({
    styles: {
      default: {
        document: {
          run: {
            font: bodyFont,
            size: fontSizePt * 2,
          },
          paragraph: {
            spacing: {
              line: 360,
              lineRule: docx.LineRuleType.AUTO,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: LETTER_TWIP.width, height: LETTER_TWIP.height },
            margin: { top: PAGE_MARGIN_TWIP, right: PAGE_MARGIN_TWIP, bottom: PAGE_MARGIN_TWIP, left: PAGE_MARGIN_TWIP },
          },
        },
        children,
      },
    ],
  })
  const blob = await docx.Packer.toBlob(doc)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  await saveExport(`${slug(project.title)}.docx`, bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', [
    { name: 'Word', extensions: ['docx'] },
  ])
}

// ---------------------------------------------------------------------------
// EPUB
// ---------------------------------------------------------------------------

function proseXhtml(node: JSONContent): string {
  if (node.type === 'heading') return `<h2>${escapeHtml(textOf(node, ''))}</h2>`
  const text = (node.content ?? [])
    .map((c) => {
      if (c.type === 'hard_break') return '<br/>'
      const marks = c.marks?.map((m) => m.type) ?? []
      let t = escapeHtml(c.text ?? '')
      if (marks.includes('em')) t = `<em>${t}</em>`
      if (marks.includes('strong')) t = `<strong>${t}</strong>`
      return t
    })
    .join('')
  return `<p>${text || '&nbsp;'}</p>`
}

function inlineXhtml(node: JSONContent): string {
  return (node.content ?? []).map((c) => (c.type === 'hard_break' ? '<br/>' : escapeHtml(c.text ?? ''))).join('')
}

function sceneXhtml(doc: SceneDoc, mode: Project['mode']): string {
  if (mode === 'novel') return doc.content.map(proseXhtml).join('\n')
  return doc.content.map((n) => `<p class="el-${n.type}">${inlineXhtml(n) || '&nbsp;'}</p>`).join('\n')
}

export async function exportEpub(project: Project, scenes: Record<string, SceneDoc>): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const units = compileUnits(project, scenes)
  const chapters: { title: string; body: string }[] = []
  let current: { title: string; body: string[] } | null = null

  for (const u of units) {
    if (u.kind === 'heading') {
      if (current) chapters.push({ title: current.title, body: current.body.join('\n') })
      current = { title: u.text, body: [] }
    } else {
      if (!current) current = { title: u.title, body: [] }
      current.body.push(sceneXhtml(u.doc, project.mode))
    }
  }
  if (current) chapters.push({ title: current.title, body: current.body.join('\n') })
  if (!chapters.length) chapters.push({ title: project.title, body: '<p></p>' })

  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
  )
  const justifyCss = project.settings.justify ? ' p{text-align:justify}' : ''
  zip.file('OEBPS/style.css', `body{font-family:serif;line-height:1.5} h1,h2{font-family:sans-serif}${justifyCss}`)

  const manifest = chapters.map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('\n')

  const xhtml = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeHtml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`

  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Indice</title></head>
<body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="c${i}.xhtml">${escapeHtml(c.title)}</a></li>`).join('')}</ol></nav></body></html>`,
  )

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${project.id}</dc:identifier>
<dc:title>${escapeHtml(project.title)}</dc:title>
<dc:language>${project.settings.language ?? 'it'}</dc:language>
<dc:creator>${escapeHtml(project.settings.author || project.author || 'Anonimo')}</dc:creator>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${manifest}</manifest>
<spine>${spine}</spine>
</package>`,
  )

  chapters.forEach((c, i) => zip.file(`OEBPS/c${i}.xhtml`, xhtml(c.title, c.body)))

  const bytes = await zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' })
  await saveExport(`${slug(project.title)}.epub`, bytes, 'application/epub+zip', [{ name: 'EPUB', extensions: ['epub'] }])
}
