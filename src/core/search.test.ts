import { describe, expect, it } from 'vitest'
import { searchProject } from './search'
import type { Project } from './types'
import type { SceneDoc } from './json'

const scene = (text: string): SceneDoc => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

const project: Project = {
  id: 'p',
  version: 1,
  title: 'T',
  mode: 'novel',
  author: '',
  snapshots: {},
  binder: [
    { id: 's1', title: 'Incontro', kind: 'scene', metadata: {} },
    { id: 's2', title: 'Fuga', kind: 'scene', metadata: {} },
  ],
  settings: { fontFamily: 'x', fontSizePt: 12, author: '' },
  createdAt: '',
  modifiedAt: '',
}

const scenes: Record<string, SceneDoc> = { s1: scene('Anna incontra Bruno'), s2: scene('Nessuno lo sa') }

describe('search', () => {
  it('finds text and returns a snippet', () => {
    const hits = searchProject(project, scenes, 'bruno')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.sceneId).toBe('s1')
    expect(hits[0]!.snippet).toContain('Bruno')
  })

  it('finds by scene title', () => {
    const hits = searchProject(project, scenes, 'fuga')
    expect(hits.map((h) => h.sceneId)).toEqual(['s2'])
  })

  it('ignores very short queries', () => {
    expect(searchProject(project, scenes, 'a')).toHaveLength(0)
  })
})
