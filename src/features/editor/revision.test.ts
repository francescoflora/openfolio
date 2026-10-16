import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import { screenplaySchema } from '@/core/schema/screenplay'
import { applyRevisionToSelection, clearRevisions } from './revision'

describe('revision commands', () => {
  const schema = screenplaySchema

  it('applies and toggles revision mark on selection', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'action', content: [{ type: 'text', text: 'Hello world' }] }],
    })
    // Select "world" (pos 7 to 12)
    let state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 7, 12),
    })

    const dispatch = (tr: Transaction) => {
      state = state.apply(tr)
    }

    // Apply revision mark
    applyRevisionToSelection(schema)(state, dispatch)
    expect(state.doc.rangeHasMark(7, 12, schema.marks.revision)).toBe(true)

    // Running again on the same selection toggles it off
    applyRevisionToSelection(schema)(state, dispatch)
    expect(state.doc.rangeHasMark(7, 12, schema.marks.revision)).toBe(false)
  })

  it('clearRevisions clears only selection when selection is not empty', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'action',
          content: [
            { type: 'text', marks: [{ type: 'revision' }], text: 'First line. ' },
            { type: 'text', marks: [{ type: 'revision' }], text: 'Second line.' },
          ],
        },
      ],
    })

    // Select only "Second line." (pos 13 to 25)
    let state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 13, 25),
    })

    const dispatch = (tr: Transaction) => {
      state = state.apply(tr)
    }

    clearRevisions(schema)(state, dispatch)

    // First line should still have revision mark
    expect(state.doc.rangeHasMark(1, 12, schema.marks.revision)).toBe(true)
    // Second line should have revision mark cleared (accepted)
    expect(state.doc.rangeHasMark(13, 25, schema.marks.revision)).toBe(false)
  })

  it('clearRevisions clears all revisions across entire doc when selection is empty', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'action',
          content: [
            { type: 'text', marks: [{ type: 'revision' }], text: 'First line. ' },
            { type: 'text', marks: [{ type: 'revision' }], text: 'Second line.' },
          ],
        },
      ],
    })

    // Cursor at pos 1, empty selection
    let state = EditorState.create({
      doc,
      selection: TextSelection.create(doc, 1, 1),
    })

    const dispatch = (tr: Transaction) => {
      state = state.apply(tr)
    }

    clearRevisions(schema)(state, dispatch)

    // Both lines should be cleared
    expect(state.doc.rangeHasMark(1, 25, schema.marks.revision)).toBe(false)
  })
})
