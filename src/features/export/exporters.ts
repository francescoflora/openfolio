import type { JSONContent, SceneDoc } from '@/core/json'
import type { Project } from '@/core/types'
import { compileUnits, escapeHtml, SCREENPLAY_INDENT_IN } from '@/core/compile'
import { slug, textOf } from '@/core/stats'
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
    case 'section_heading':
    case 'heading':
      return new docx.Paragraph({
        children: screenplayRuns(docx, node, font, true),
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 480, after: 240 },
      })
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

export async function buildDocxDocument(project: Project, scenes: Record<string, SceneDoc>): Promise<InstanceType<Docx['Document']>> {
  const docx = await import('docx')
  const units = compileUnits(project, scenes)
  const tp = project.settings.titlePage
  const titleChildren: InstanceType<Docx['Paragraph']>[] = []

  const bodyFont = cleanFontName(
    project.settings.elementFonts?.paragraph || project.settings.fontFamily,
    project.mode === 'screenplay' ? 'Courier Prime' : 'EB Garamond',
  )
  const headingFont = cleanFontName(
    project.settings.elementFonts?.heading,
    bodyFont,
  )
  const fontSizePt = project.settings.fontSizePt || 12

  const hasTitlePage = (tp as any)?.disabled !== true

  if (hasTitlePage) {
    const titleText =
      tp?.title?.trim() ||
      project.title.trim() ||
      (project.settings.language === 'en' ? 'Untitled' : 'Senza titolo')
    const authorText =
      tp?.author?.trim() ||
      project.settings.author?.trim() ||
      project.author?.trim() ||
      ''
    const contactText = tp?.contact?.trim() || ''

    titleChildren.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: project.mode === 'screenplay' ? titleText.toUpperCase() : titleText,
            bold: true,
            size: 36,
            font: headingFont,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 2880, after: 720 },
      }),
    )

    if (authorText) {
      const isEn = project.settings.language === 'en'
      const byPrefix = project.mode === 'novel'
        ? (isEn ? 'by ' : 'di ')
        : (isEn ? 'written by\n\n' : 'scritto da\n\n')

      const authorParagraphs = (byPrefix + authorText).split('\n').map((line) =>
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: line.trim(),
              size: 24,
              font: bodyFont,
            }),
          ],
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 360 },
        }),
      )
      titleChildren.push(...authorParagraphs)
    }

    if (contactText) {
      const contactParagraphs = contactText.split('\n').map((line, idx) =>
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: line.trim(),
              size: 20,
              font: bodyFont,
            }),
          ],
          alignment: project.mode === 'screenplay' ? docx.AlignmentType.LEFT : docx.AlignmentType.CENTER,
          spacing: idx === 0 ? { before: 2160, after: 120 } : { after: 120 },
        }),
      )
      titleChildren.push(...contactParagraphs)
    }
  }

  const sections = []
  if (hasTitlePage) {
    sections.push({
      properties: {
        page: {
          size: { width: LETTER_TWIP.width, height: LETTER_TWIP.height },
          margin: { top: PAGE_MARGIN_TWIP, right: PAGE_MARGIN_TWIP, bottom: PAGE_MARGIN_TWIP, left: PAGE_MARGIN_TWIP },
        },
      },
      children: titleChildren,
    })
  }

  const showPageNumbers = project.settings.pageNumbers !== false

  const footer = new docx.Footer({
    children: [
      new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [
          new docx.TextRun({
            children: [docx.PageNumber.CURRENT],
            font: bodyFont,
            size: 20, // 10pt
          }),
        ],
      }),
    ],
  })

  let currentSceneChildren: InstanceType<Docx['Paragraph']>[] = []
  let isFirstSceneSection = true
  let isFirstSceneInBlock = true

  const flushSceneSection = () => {
    if (currentSceneChildren.length === 0) return
    const sceneSection: any = {
      properties: {
        page: {
          size: { width: LETTER_TWIP.width, height: LETTER_TWIP.height },
          margin: { top: PAGE_MARGIN_TWIP, right: PAGE_MARGIN_TWIP, bottom: PAGE_MARGIN_TWIP, left: PAGE_MARGIN_TWIP },
          pageNumbers: isFirstSceneSection ? { start: 1 } : undefined,
        },
      },
      children: currentSceneChildren,
    }
    if (showPageNumbers) {
      sceneSection.footers = {
        default: footer,
      }
    }
    sections.push(sceneSection)
    isFirstSceneSection = false
    currentSceneChildren = []
    isFirstSceneInBlock = true
  }

  for (const u of units) {
    if (u.kind === 'heading') {
      // Flush prior scene section if any
      flushSceneSection()

      // Dedicated section page for this part/section heading (no footer => no page number)
      const headingParagraph = new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: u.text.toUpperCase(),
            bold: true,
            size: project.mode === 'novel' ? 36 : 28,
            font: headingFont,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: project.mode === 'novel' ? { before: 4000, after: 720 } : { before: 2880, after: 720 },
      })

      sections.push({
        properties: {
          page: {
            size: { width: LETTER_TWIP.width, height: LETTER_TWIP.height },
            margin: { top: PAGE_MARGIN_TWIP, right: PAGE_MARGIN_TWIP, bottom: PAGE_MARGIN_TWIP, left: PAGE_MARGIN_TWIP },
          },
        },
        children: [headingParagraph],
      })
      continue
    }

    if (!isFirstSceneInBlock) {
      currentSceneChildren.push(new docx.Paragraph({ children: [new docx.PageBreak()] }))
    }
    isFirstSceneInBlock = false

    for (const n of u.doc.content) {
      currentSceneChildren.push(
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

  flushSceneSection()

  if (sections.length === 0) {
    sections.push({
      properties: {
        page: {
          size: { width: LETTER_TWIP.width, height: LETTER_TWIP.height },
          margin: { top: PAGE_MARGIN_TWIP, right: PAGE_MARGIN_TWIP, bottom: PAGE_MARGIN_TWIP, left: PAGE_MARGIN_TWIP },
        },
      },
      children: [new docx.Paragraph({ children: [new docx.TextRun('')] })],
    })
  }

  return new docx.Document({
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
    sections,
  })
}

export async function exportDocx(project: Project, scenes: Record<string, SceneDoc>): Promise<boolean> {
  const docx = await import('docx')
  const doc = await buildDocxDocument(project, scenes)
  const blob = await docx.Packer.toBlob(doc)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return await saveExport(`${slug(project.title)}.docx`, bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', [
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

export async function exportEpub(project: Project, scenes: Record<string, SceneDoc>): Promise<boolean> {
  const { default: JSZip } = await import('jszip')
  const units = compileUnits(project, scenes)
  const chapters: { title: string; body: string }[] = []
  let pendingHeadings: string[] = []

  for (const u of units) {
    if (u.kind === 'heading') {
      pendingHeadings.push(u.text)
      continue
    }

    const sceneContent = sceneXhtml(u.doc, project.mode)
    if (pendingHeadings.length > 0) {
      const headingHtml = pendingHeadings
        .map((h, idx) => `<h${Math.min(idx + 1, 3)}>${escapeHtml(h)}</h${Math.min(idx + 1, 3)}>`)
        .join('\n')
      const tocTitle = pendingHeadings.join(' — ')
      chapters.push({
        title: tocTitle,
        body: `<section class="scene">\n${headingHtml}\n${sceneContent}\n</section>`,
      })
      pendingHeadings = []
    } else {
      chapters.push({
        title: u.title,
        body: `<section class="scene">\n${sceneContent}\n</section>`,
      })
    }
  }

  if (pendingHeadings.length > 0) {
    const headingHtml = pendingHeadings
      .map((h, idx) => `<h${Math.min(idx + 1, 3)}>${escapeHtml(h)}</h${Math.min(idx + 1, 3)}>`)
      .join('\n')
    chapters.push({
      title: pendingHeadings.join(' — '),
      body: `<section class="scene">\n${headingHtml}\n</section>`,
    })
  }

  if (!chapters.length) chapters.push({ title: project.title, body: '<section class="scene"><p></p></section>' })

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
  zip.file(
    'OEBPS/style.css',
    `body{font-family:serif;line-height:1.5} h1,h2,h3{font-family:sans-serif} .scene{page-break-before:always;break-before:page}${justifyCss}`,
  )

  const tp = project.settings.titlePage
  const hasTitlePage = (tp as any)?.disabled !== true

  const titleText =
    tp?.title?.trim() ||
    project.title.trim() ||
    (project.settings.language === 'en' ? 'Untitled' : 'Senza titolo')
  const authorText =
    tp?.author?.trim() ||
    project.settings.author?.trim() ||
    project.author?.trim() ||
    ''
  const contactText = tp?.contact?.trim() || ''

  if (hasTitlePage) {
    const isEn = project.settings.language === 'en'
    const byPrefix = project.mode === 'novel' ? (isEn ? 'by' : 'di') : (isEn ? 'written by' : 'scritto da')
    const titlePageXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeHtml(titleText)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body class="title-page" epub:type="titlepage" style="margin:0;padding:2em;text-align:center;">
  <div style="margin-top:20vh;margin-bottom:2em;">
    <h1 style="font-size:2.2em;font-family:sans-serif;text-transform:uppercase;margin-bottom:0.5em;line-height:1.2;">${escapeHtml(project.mode === 'screenplay' ? titleText.toUpperCase() : titleText)}</h1>
    ${authorText ? `<p style="font-size:1.2em;font-style:italic;margin-top:1.5em;color:#444;">${escapeHtml(byPrefix)} ${escapeHtml(authorText)}</p>` : ''}
  </div>
  ${contactText ? `<div style="margin-top:25vh;font-size:0.85em;color:#666;white-space:pre-line;line-height:1.4;">${escapeHtml(contactText)}</div>` : ''}
</body>
</html>`
    zip.file('OEBPS/title.xhtml', titlePageXhtml)
  }

  const manifest = chapters.map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('\n')
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('\n')

  const xhtml = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeHtml(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`

  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${escapeHtml(project.settings.language === 'en' ? 'Table of Contents' : 'Indice')}</title></head>
<body><nav epub:type="toc"><ol>${hasTitlePage ? `<li><a href="title.xhtml">${escapeHtml(project.settings.language === 'en' ? 'Title Page' : 'Frontespizio')}</a></li>` : ''}${chapters.map((c, i) => `<li><a href="c${i}.xhtml">${escapeHtml(c.title)}</a></li>`).join('')}</ol></nav></body></html>`,
  )

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${project.id}</dc:identifier>
<dc:title>${escapeHtml(titleText)}</dc:title>
<dc:language>${project.settings.language ?? 'it'}</dc:language>
<dc:creator>${escapeHtml(authorText || 'Anonimo')}</dc:creator>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${hasTitlePage ? '<item id="titlepage" href="title.xhtml" media-type="application/xhtml+xml"/>\n' : ''}${manifest}</manifest>
<spine>${hasTitlePage ? '<itemref idref="titlepage"/>\n' : ''}${spine}</spine>
</package>`,
  )

  chapters.forEach((c, i) => zip.file(`OEBPS/c${i}.xhtml`, xhtml(c.title, c.body)))

  const bytes = await zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' })
  return await saveExport(`${slug(project.title)}.epub`, bytes, 'application/epub+zip', [{ name: 'EPUB', extensions: ['epub'] }])
}
