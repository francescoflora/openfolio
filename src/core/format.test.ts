import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SCREENPLAY_INDENT_IN, compileHtml } from './compile'
import type { Project } from './types'
import type { SceneDoc } from './json'

const scene: SceneDoc = {
  type: 'doc',
  content: [
    { type: 'scene_heading', content: [{ type: 'text', text: 'INT. CASA - NOTTE' }] },
    { type: 'character', content: [{ type: 'text', text: 'ERODOS' }] },
    { type: 'dialogue', content: [{ type: 'text', text: 'Ciao.' }] },
  ],
}

const project: Project = {
  id: 'p1',
  version: 1,
  title: 'Prova',
  mode: 'screenplay',
  author: '',
  binder: [{ id: 's1', title: 'Scena 1', kind: 'scene', metadata: {} }],
  snapshots: {},
  settings: { fontFamily: 'Courier Prime', fontSizePt: 12, author: '' },
  createdAt: '',
  modifiedAt: '',
}

describe('screenplay formatting', () => {
  it('matches the Final Draft page-left indents (page edge, 1in margin)', () => {
    const pageLeft = (offset: number) => 1 + offset
    expect(pageLeft(SCREENPLAY_INDENT_IN.sceneHeading)).toBeCloseTo(1.5)
    expect(pageLeft(SCREENPLAY_INDENT_IN.action)).toBeCloseTo(1.5)
    expect(pageLeft(SCREENPLAY_INDENT_IN.shot)).toBeCloseTo(1.5)
    expect(pageLeft(SCREENPLAY_INDENT_IN.character)).toBeCloseTo(3.5)
    expect(pageLeft(SCREENPLAY_INDENT_IN.parenthetical)).toBeCloseTo(3.0)
    expect(pageLeft(SCREENPLAY_INDENT_IN.dialogueLeft)).toBeCloseTo(2.5)
    expect(7.5 - SCREENPLAY_INDENT_IN.dialogueRight).toBeCloseTo(5.5)
  })

  it('emits those indents in the print HTML', () => {
    const html = compileHtml(project, { s1: scene }, true)
    expect(html).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.sceneHeading}in`)
    expect(html).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.character}in`)
    expect(html).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.parenthetical}in`)
    expect(html).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.dialogueLeft}in`)
    expect(html).toContain(`padding-right: ${SCREENPLAY_INDENT_IN.dialogueRight}in`)
  })

  it('justifies novel paragraphs only when the setting is on', () => {
    const novel: Project = { ...project, mode: 'novel' }
    const on = compileHtml({ ...novel, settings: { ...novel.settings, justify: true } }, { s1: scene }, true)
    expect(on).toContain('<section class="novel justify">')
    expect(on).toContain('.novel.justify p { text-align: justify; }')
    const off = compileHtml(novel, { s1: scene }, true)
    expect(off).toContain('<section class="novel">')
  })

  it('renders a soft break as <br> in the print HTML', () => {
    const withBreak: SceneDoc = {
      type: 'doc',
      content: [
        {
          type: 'action',
          content: [{ type: 'text', text: 'Riga 1' }, { type: 'hard_break' }, { type: 'text', text: 'Riga 2' }],
        },
      ],
    }
    const html = compileHtml(project, { s1: withBreak }, true)
    expect(html).toContain('Riga 1<br>Riga 2')
  })

  it('styles scene headings with the class the DOM actually emits', () => {
    const html = compileHtml(project, { s1: scene }, true)
    expect(html).toContain('class="el-scene_heading"')
    expect(html).toContain('.el-scene_heading')
  })

  it('keeps the editor CSS in sync with the print CSS', () => {
    const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')
    expect(css).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.sceneHeading}in`)
    expect(css).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.character}in`)
    expect(css).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.parenthetical}in`)
    expect(css).toContain(`padding-left: ${SCREENPLAY_INDENT_IN.dialogueLeft}in`)
    expect(css).toContain(`padding-right: ${SCREENPLAY_INDENT_IN.dialogueRight}in`)
    expect(css).toContain('.el-scene_heading')
    expect(css).not.toContain('el-sceneHeading')
  })
})
