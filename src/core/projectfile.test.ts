import { describe, expect, it } from 'vitest'
import { parseProjectFile, serializeProjectFile } from './projectfile'
import type { Project } from './types'
import type { SceneDoc } from './json'

const scene = (text: string): SceneDoc => ({ type: 'doc', content: [{ type: 'action', content: [{ type: 'text', text }] }] })

const project: Project = {
  id: 'p1',
  version: 1,
  title: 'La mia sceneggiatura',
  mode: 'screenplay',
  author: 'Mario',
  binder: [
    { id: 'f1', title: 'Atto 1', kind: 'folder', metadata: {}, children: [
      { id: 's1', title: 'Scena 1', kind: 'scene', metadata: { status: 'draft', wordCount: 3 } },
      { id: 's2', title: 'Scena 2', kind: 'scene', metadata: {} },
    ] },
    { id: 's3', title: 'Scena 3', kind: 'scene', metadata: {} },
  ],
  snapshots: {},
  settings: { fontFamily: 'Courier Prime', fontSizePt: 12, author: 'Mario' },
  createdAt: '2026-01-01T00:00:00.000Z',
  modifiedAt: '2026-01-01T00:00:00.000Z',
}

describe('project file', () => {
  it('round-trips project, folders and scenes', () => {
    const scenes = { s1: scene('a'), s2: scene('b'), s3: scene('c') }
    const { project: p, scenes: s } = parseProjectFile(serializeProjectFile(project, scenes))
    expect(p).toEqual(project)
    expect(s).toEqual(scenes)
  })

  it('rejects an invalid file', () => {
    expect(() => parseProjectFile('{"foo":1}')).toThrow()
    expect(() => parseProjectFile('not json')).toThrow()
  })
})
