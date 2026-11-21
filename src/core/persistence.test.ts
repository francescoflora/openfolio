import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addRecent, clearRecents, listRecent, MAX_RECENT, removeRecent, upsertRecent } from './persistence'
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

describe('recent-project storage', () => {
  let values: Map<string, string>

  beforeEach(() => {
    values = new Map()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each(['null', '{}', '42', '"recent"', 'invalid json'])('ignores invalid cached lists: %s', (raw) => {
    values.set('openfolio.recent', raw)
    expect(listRecent()).toEqual([])
  })

  it('filters malformed entries and caps the cached list', () => {
    const valid = Array.from({ length: MAX_RECENT + 2 }, (_, i) => entry(`project-${i}`))
    values.set('openfolio.recent', JSON.stringify([
      null,
      {},
      { ...entry(''), path: '' },
      { ...entry('invalid-mode'), mode: 'other' },
      { ...entry('invalid-title'), title: 42 },
      { ...entry('invalid-date'), modifiedAt: 'not a date' },
      ...valid,
    ]))
    expect(listRecent()).toEqual(valid.slice(0, MAX_RECENT))
  })

  it('can add and remove entries after recovering from malformed storage', () => {
    values.set('openfolio.recent', '{}')
    addRecent('first.ofp', 'First', 'screenplay')
    addRecent('second.ofp', 'Second', 'novel')
    expect(listRecent().map((recent) => recent.path)).toEqual(['second.ofp', 'first.ofp'])
    removeRecent('second.ofp')
    expect(listRecent().map((recent) => recent.path)).toEqual(['first.ofp'])
  })

  it('keeps cache write failures from failing successful document operations', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('Quota exceeded') })
    vi.mocked(localStorage.removeItem).mockImplementation(() => { throw new Error('Storage unavailable') })
    expect(() => addRecent('project.ofp', 'Project', 'novel')).not.toThrow()
    expect(() => removeRecent('project.ofp')).not.toThrow()
    expect(() => clearRecents()).not.toThrow()
  })

  it('handles an unavailable storage backend', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(listRecent()).toEqual([])
    expect(() => addRecent('project.ofp', 'Project', 'novel')).not.toThrow()
    expect(() => removeRecent('project.ofp')).not.toThrow()
  })
})
