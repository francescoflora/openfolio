import { describe, expect, it } from 'vitest'
import { compileHtml, compileMarkdown, compileText, compileUnits } from './compile'
import type { Project } from './types'
import type { SceneDoc } from './json'

const scene = (text: string): SceneDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

const screenplayScene = (text: string): SceneDoc => ({
  type: 'doc',
  content: [
    { type: 'scene_heading', content: [{ type: 'text', text: 'INT. SALONE - GIORNO' }] },
    { type: 'action', content: [{ type: 'text', text }] },
  ],
})

const project: Project = {
  id: 'p1',
  version: 1,
  title: 'Prova',
  mode: 'novel',
  author: 'Io',
  binder: [
    {
      id: 'f1',
      title: 'Capitolo 1',
      kind: 'folder',
      metadata: {},
      children: [
        { id: 's1', title: 'Scena 1', kind: 'scene', metadata: {} },
        { id: 's2', title: 'Scena 2', kind: 'scene', metadata: {} },
      ],
    },
  ],
  snapshots: {},
  settings: { fontFamily: 'x', fontSizePt: 12, author: '' },
  createdAt: '',
  modifiedAt: '',
}

const scenes: Record<string, SceneDoc> = { s1: scene('Ciao mondo'), s2: scene('Buonanotte') }

describe('compile', () => {
  it('walks the binder into ordered units', () => {
    const units = compileUnits(project, scenes)
    expect(units.map((u) => u.kind)).toEqual(['heading', 'scene', 'scene'])
    expect(units[0]).toMatchObject({ level: 0, text: 'Capitolo 1' })
  })

  it('compiles markdown with chapter headings', () => {
    const md = compileMarkdown(project, scenes)
    expect(md).toContain('## Capitolo 1')
    expect(md).toContain('Ciao mondo')
    expect(md).toContain('Buonanotte')
  })

  it('compiles plain text in order', () => {
    const txt = compileText(project, scenes)
    expect(txt.indexOf('Ciao mondo')).toBeLessThan(txt.indexOf('Buonanotte'))
  })

  it('compiles screenplay html with section heading', () => {
    const spProject: Project = {
      ...project,
      mode: 'screenplay',
      binder: [
        {
          id: 'sec1',
          title: 'Atto I',
          kind: 'folder',
          metadata: {},
          children: [{ id: 'sc1', title: 'Scena 1', kind: 'scene', metadata: {} }],
        },
      ],
    }
    const spScenes: Record<string, SceneDoc> = {
      sc1: screenplayScene('Inizio scena.'),
    }
    const html = compileHtml(spProject, spScenes, false)
    expect(html).toContain('el-section_heading')
    expect(html).toContain('ATTO I')
    expect(html).toContain('INT. SALONE - GIORNO')
  })

  it('compiles title page with title, author and contact info', () => {
    const tpProject: Project = {
      ...project,
      title: 'Il Mio Film',
      settings: {
        fontFamily: 'Courier Prime',
        fontSizePt: 12,
        author: 'Mario Rossi',
        titlePage: {
          title: 'Il Mio Film',
          author: 'Mario Rossi',
          contact: 'mario@example.com\n+39 123 456789',
        },
      },
    }
    const html = compileHtml(tpProject, scenes, true)
    expect(html).toContain('class="title-page"')
    expect(html).toContain('Il Mio Film')
    expect(html).toContain('Mario Rossi')
    expect(html).toContain('mario@example.com')
    expect(html).toContain('+39 123 456789')
  })

  it('compiles novel mode with each scene in a .scene container for page breaks', () => {
    const html = compileHtml(project, scenes, true)
    expect(html).toContain('class="scene novel-scene"')
    const sceneMatches = html.match(/class="scene novel-scene"/g)
    expect(sceneMatches?.length).toBe(2)
  })

  it('compiles screenplay mode with each scene in a .scene.script-page container for page breaks', () => {
    const spProject: Project = {
      ...project,
      mode: 'screenplay',
      binder: [
        { id: 'sc1', title: 'Scena 1', kind: 'scene', metadata: {} },
        { id: 'sc2', title: 'Scena 2', kind: 'scene', metadata: {} },
      ],
    }
    const spScenes: Record<string, SceneDoc> = {
      sc1: screenplayScene('Scena uno.'),
      sc2: screenplayScene('Scena due.'),
    }
    const html = compileHtml(spProject, spScenes, true)
    const sceneMatches = html.match(/class="scene script-page"/g)
    expect(sceneMatches?.length).toBe(2)
  })
})
