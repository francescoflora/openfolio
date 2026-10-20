import type { BinderNode, Project } from './types'
import type { JSONContent, SceneDoc } from './json'
import { textOf } from './stats'

export type CompileUnit =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'scene'; title: string; doc: SceneDoc }

export function compileUnits(project: Project, scenes: Record<string, SceneDoc>): CompileUnit[] {
  const units: CompileUnit[] = []
  const walk = (nodes: BinderNode[], depth: number) => {
    for (const n of nodes) {
      if (n.kind === 'folder') {
        units.push({ kind: 'heading', level: depth, text: n.title })
        if (n.children) walk(n.children, depth + 1)
      } else {
        const doc = scenes[n.id]
        if (doc) units.push({ kind: 'scene', title: n.title, doc })
      }
    }
  }
  walk(project.binder, 0)
  return units
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------------------------------------------------------------------------
// Plain text / Markdown
// ---------------------------------------------------------------------------

export function compileText(project: Project, scenes: Record<string, SceneDoc>): string {
  const out: string[] = []
  for (const u of compileUnits(project, scenes)) {
    if (u.kind === 'heading') out.push(`${'#'.repeat(Math.min(u.level + 1, 6))} ${u.text}\n`)
    else out.push(u.doc.content.map((n) => textOf(n)).filter(Boolean).join('\n\n') + '\n')
  }
  return out.join('\n')
}

export function compileMarkdown(project: Project, scenes: Record<string, SceneDoc>): string {
  const out: string[] = [`# ${project.title}\n`]
  for (const u of compileUnits(project, scenes)) {
    if (u.kind === 'heading') {
      out.push(`${'#'.repeat(Math.min(u.level + 2, 6))} ${u.text}\n`)
      continue
    }
    if (project.mode === 'screenplay') {
      out.push(u.doc.content.map((n) => textOf(n)).join('\n\n') + '\n')
    } else {
      for (const n of u.doc.content) out.push(mdBlock(n))
      out.push('')
    }
  }
  return out.join('\n')
}

function mdInline(node: JSONContent): string {
  return (node.content ?? [])
    .map((c) => {
      if (c.type === 'hard_break') return '\n'
      if (c.text) {
        const marks = c.marks?.map((m) => m.type) ?? []
        let t = c.text
        if (marks.includes('strong')) t = `**${t}**`
        if (marks.includes('em')) t = `*${t}*`
        return t
      }
      return mdInline(c)
    })
    .join('')
}

function mdBlock(node: JSONContent): string {
  if (node.type === 'heading') return `${'#'.repeat(Number(node.attrs?.level ?? 1))} ${mdInline(node)}`
  if (node.type === 'blockquote') return `> ${(node.content ?? []).map(mdInline).join(' ')}`
  return mdInline(node)
}

// ---------------------------------------------------------------------------
// HTML (used for print / PDF via Paged.js)
// ---------------------------------------------------------------------------

function inlineHtml(node: JSONContent): string {
  return (node.content ?? [])
    .map((c) => {
      if (c.type === 'hard_break') return '<br>'
      if (c.text) {
        const marks = c.marks?.map((m) => m.type) ?? []
        let t = escapeHtml(c.text)
        if (marks.includes('strong')) t = `<strong>${t}</strong>`
        if (marks.includes('em')) t = `<em>${t}</em>`
        return t
      }
      return inlineHtml(c)
    })
    .join('')
}

function screenplaySceneHtml(doc: SceneDoc, prefixHtml?: string): string {
  const sceneElements = doc.content
    .map((n) => `<div class="el-${n.type}">${inlineHtml(n) || '&nbsp;'}</div>`)
    .join('\n')
  const body = prefixHtml ? `${prefixHtml}\n${sceneElements}` : sceneElements
  return `<section class="scene script-page">${body}</section>`
}

function proseSceneHtml(doc: SceneDoc): string {
  return doc.content
    .map((n) => {
      if (n.type === 'heading') return `<h${n.attrs?.level ?? 2}>${inlineHtml(n)}</h${n.attrs?.level ?? 2}>`
      if (n.type === 'blockquote') return `<blockquote>${(n.content ?? []).map(inlineHtml).join('')}</blockquote>`
      return `<p>${inlineHtml(n) || '&nbsp;'}</p>`
    })
    .join('\n')
}

/**
 * Final Draft element offsets in inches, measured from the left text margin
 * (page left edge + 1in). Editor padding and DOCX paragraph indents share this
 * frame, so one table keeps the CSS and the exporters in sync.
 */
export const SCREENPLAY_INDENT_IN = {
  sceneHeading: 0.5,
  action: 0.5,
  shot: 0.5,
  character: 2.5,
  parenthetical: 2,
  dialogueLeft: 1.5,
  dialogueRight: 2,
} as const

const PAGE_CSS = `
@page {
  size: letter;
  margin: 1in;
  @bottom-center {
    content: counter(page);
    font-size: 10pt;
    font-family: inherit;
    color: #000;
  }
}
@page title-page {
  margin: 1in;
  @bottom-center {
    content: none;
  }
}
@page part-page {
  margin: 1in;
  @bottom-center {
    content: none;
  }
}
`

const PRINT_CSS = `
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Courier Prime', 'Courier New', monospace; font-size: 12pt; color: #000; }
h1.book-title { font-family: 'Inter', sans-serif; text-align: center; margin: 3in 1in; font-size: 24pt; }
.script-page { line-height: 1.18; }
.script-page .el-section_heading { text-align: center; font-weight: 700; text-transform: uppercase; margin: 2em 0 1.2em; letter-spacing: 0.05em; }
.script-page .el-scene_heading { text-transform: uppercase; font-weight: 700; margin: 1.85em 0 0.85em; padding-left: ${SCREENPLAY_INDENT_IN.sceneHeading}in; letter-spacing: 0.02em; }
.script-page .el-action { margin: 0.85em 0; padding-left: ${SCREENPLAY_INDENT_IN.action}in; }
.script-page .el-character { text-transform: uppercase; font-weight: 700; margin: 1.25em 0 0; padding-left: ${SCREENPLAY_INDENT_IN.character}in; letter-spacing: 0.02em; }
.script-page .el-parenthetical { margin: 0; padding-left: ${SCREENPLAY_INDENT_IN.parenthetical}in; font-style: italic; }
.script-page .el-dialogue { margin: 0 0 .45em; padding-left: ${SCREENPLAY_INDENT_IN.dialogueLeft}in; padding-right: ${SCREENPLAY_INDENT_IN.dialogueRight}in; }
.script-page .el-transition { text-transform: uppercase; font-weight: 700; text-align: right; margin: 1.35em 0; }
.script-page .el-shot { text-transform: uppercase; font-weight: 700; margin: 1.35em 0; padding-left: ${SCREENPLAY_INDENT_IN.shot}in; }
.scene { break-before: page; }
.scene.script-page:first-of-type, .novel-scene:first-of-type { counter-reset: page 1; }
.title-page { page: title-page; break-after: page; text-align: center; margin-top: 3in; }
.title-page h1 { font-size: 24pt; margin: 0 0 .5in; }
.title-page .contact { margin-top: 2.5in; font-size: 11pt; white-space: pre-line; }
.novel section, .novel h1, .novel h2, .novel h3 { break-inside: auto; }
.novel h1 { font-family: 'EB Garamond', 'Times New Roman', Cambria, serif; text-align: center; text-transform: uppercase; letter-spacing: 0.2em; font-size: 16pt; margin: 2in 0 1.5in; break-after: avoid; font-variant-numeric: lining-nums; font-feature-settings: 'lnum' 1; }
.novel h2, .novel h3 { font-family: 'EB Garamond', 'Times New Roman', Cambria, serif; font-weight: bold; margin: 1.5em 0 .5em; break-after: avoid; font-variant-numeric: lining-nums; font-feature-settings: 'lnum' 1; }
.novel p { font-family: 'Courier Prime', 'Courier New', monospace; text-indent: 1.75em; margin: 0; }
.novel.no-indent p { text-indent: 0; margin-bottom: 0.85em; }
.novel { font-size: 12pt; line-height: 2; font-variant-numeric: lining-nums; font-feature-settings: 'lnum' 1; }
.novel.justify p { text-align: justify; }
.novel blockquote { font-family: 'Courier Prime', 'Courier New', monospace; font-style: italic; margin: 1em 2em; }
.part-page { page: part-page; break-before: page; break-after: page; text-align: center; padding-top: 3in; }
.part-page h1 { font-family: 'EB Garamond', 'Times New Roman', Cambria, serif; text-align: center; text-transform: uppercase; letter-spacing: 0.2em; font-size: 20pt; }
`

export function compileHtml(project: Project, scenes: Record<string, SceneDoc>, forPrint: boolean): string {
  const units = compileUnits(project, scenes)
  const body: string[] = []
  const tp = project.settings.titlePage
  const hasTitlePage = (tp as any)?.disabled !== true

  if (hasTitlePage) {
    const title = tp?.title ?? project.title
    const author = tp?.author || project.settings.author || project.author || ''
    body.push(
      `<div class="title-page"><h1>${escapeHtml(title)}</h1>${
        author ? `<p>${escapeHtml(author)}</p>` : ''
      }${tp?.contact ? `<p class="contact">${escapeHtml(tp.contact)}</p>` : ''}</div>`,
    )
  }
  if (project.mode === 'screenplay') {
    let pendingHeadings: string[] = []
    for (const u of units) {
      if (u.kind === 'heading') {
        pendingHeadings.push(`<div class="el-section_heading"><strong>${escapeHtml(u.text.toUpperCase())}</strong></div>`)
      } else {
        const prefix = pendingHeadings.length ? pendingHeadings.join('\n') : undefined
        pendingHeadings = []
        body.push(screenplaySceneHtml(u.doc, prefix))
      }
    }
    if (pendingHeadings.length > 0) {
      body.push(`<section class="scene script-page">${pendingHeadings.join('\n')}</section>`)
    }
  } else {
    body.push(`<section class="${project.settings.justify ? 'novel justify' : 'novel'}">`)
    for (const u of units) {
      if (u.kind === 'heading') {
        body.push(`<div class="part-page"><h1>${escapeHtml(u.text.toUpperCase())}</h1></div>`)
      } else {
        body.push(`<div class="scene novel-scene">${proseSceneHtml(u.doc)}</div>`)
      }
    }
    body.push('</section>')
  }

  const ef = project.settings.elementFonts ?? {}
  const fontOverrides = Object.entries(ef)
    .filter(([, font]) => Boolean(font))
    .map(([el, font]) => {
      if (el === 'heading') return `.novel h1, .novel h2, .novel h3 { font-family: ${font} !important; }`
      if (el === 'paragraph') return `.novel p { font-family: ${font} !important; }`
      if (el === 'blockquote') return `.novel blockquote { font-family: ${font} !important; }`
      return `.script-page .el-${el} { font-family: ${font} !important; }`
    })
    .join('\n')

  const showPageNumbers = project.settings.pageNumbers !== false
  const pageCss = showPageNumbers
    ? PAGE_CSS
    : PAGE_CSS.replace(/@bottom-center\s*\{[\s\S]*?\}/g, '')

  const style = forPrint
    ? `<style>${pageCss}${PRINT_CSS}${fontOverrides ? `\n${fontOverrides}` : ''}</style>`
    : `<style>.script-page,.novel{max-width:8.5in;margin:1in auto;}${PRINT_CSS}${fontOverrides ? `\n${fontOverrides}` : ''}</style>`

  const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400..700;1,400..700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">`

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(project.title)}</title>${fontLinks}${style}</head><body>${body.join('\n')}</body></html>`
}
