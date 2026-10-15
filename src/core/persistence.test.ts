import { describe, expect, it } from 'vitest'
import { upsertRecent } from './persistence'
import type { RecentProject } from './persistence'

const entry = (path: string, title = path): RecentProject => ({
  path,
  title,
  mode: 'screenplay',
  modifiedAt: '2026-01-01T00:00:00.000Z',
})

describe('upsertRecent', () => {
  it('puts the newest entry first', () => {
    const list = upsertRecent([entry('a')], entry('b'))
    expect(list.map((r) => r.path)).toEqual(['b', 'a'])
  })

  it('moves an existing path to the front instead of duplicating', () => {
    const list = upsertRecent([entry('a'), entry('b')], entry('b', 'B updated'))
    expect(list.map((r) => r.path)).toEqual(['b', 'a'])
    expect(list[0]!.title).toBe('B updated')
  })

  it('caps the list length', () => {
    let list: RecentProject[] = []
    for (let i = 0; i < 12; i++) list = upsertRecent(list, entry(`p${i}`))
    expect(list).toHaveLength(8)
    expect(list[0]!.path).toBe('p11')
  })
})
