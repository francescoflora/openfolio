import { describe, expect, it } from 'vitest'
import { EditorState } from 'prosemirror-state'
import {
  SearchQuery,
  getMatchHighlights,
  getSearchState,
  replaceAll,
  search,
  setSearchState,
} from 'prosemirror-search'
import { proseSchema } from '@/core/schema/prose'

function stateOf(text: string): EditorState {
  return EditorState.create({
    doc: proseSchema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    }),
    plugins: [search()],
  })
}

function applyQuery(state: EditorState, query: SearchQuery): EditorState {
  return state.apply(setSearchState(state.tr, query))
}

describe('find and replace', () => {
  it('highlights all matches and replaces them', () => {
    const state = applyQuery(stateOf('Anna e anna'), new SearchQuery({ search: 'anna', replace: 'Elena' }))
    expect(getSearchState(state)?.query.valid).toBe(true)
    expect(getMatchHighlights(state).find()).toHaveLength(2)

    let replaced = state
    replaceAll(state, (tr) => {
      replaced = replaced.apply(tr)
    })
    expect(replaced.doc.textContent).toBe('Elena e Elena')
  })

  it('supports case-sensitive and whole-word matching', () => {
    const caseSensitive = applyQuery(stateOf('Anna e anna'), new SearchQuery({ search: 'Anna', caseSensitive: true }))
    expect(getMatchHighlights(caseSensitive).find()).toHaveLength(1)

    const wholeWord = applyQuery(stateOf('Anna e anna'), new SearchQuery({ search: 'ann', wholeWord: true }))
    expect(getMatchHighlights(wholeWord).find()).toHaveLength(0)
  })
})
