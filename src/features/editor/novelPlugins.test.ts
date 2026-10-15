import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import type { JSONContent } from '@/core/json'
import { proseSchema } from '@/core/schema/prose'
import { novelKeymap } from './novelPlugins'

function stateOf(content: JSONContent[]): EditorState {
  return EditorState.create({ doc: proseSchema.nodeFromJSON({ type: 'doc', content }) })
}

function at(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
}

function runEnter(state: EditorState): EditorState {
  const binding = novelKeymap(proseSchema).Enter
  let current = state
  binding(state, (tr: Transaction) => {
    current = current.apply(tr)
  })
  return current
}

describe('novelKeymap', () => {
  it('splits non-empty chapter heading into a paragraph below it', () => {
    const initial = stateOf([
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'CAPITOLO 1' }],
      },
    ])
    // Position at end of 'CAPITOLO 1'
    const next = runEnter(at(initial, 11))
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('heading')
    expect(next.doc.child(0).textContent).toBe('CAPITOLO 1')
    expect(next.doc.child(1).type.name).toBe('paragraph')
    expect(next.doc.child(1).textContent).toBe('')
  })

  it('converts an empty chapter heading to paragraph on Enter', () => {
    const initial = stateOf([
      {
        type: 'heading',
        attrs: { level: 1 },
      },
    ])
    const next = runEnter(at(initial, 1))
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.child(0).type.name).toBe('paragraph')
  })

  it('returns false when cursor is on normal paragraph to let baseKeymap handle it', () => {
    const initial = stateOf([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Paragrafo di testo' }],
      },
    ])
    const binding = novelKeymap(proseSchema).Enter
    const handled = binding(at(initial, 5))
    expect(handled).toBe(false)
  })
})
