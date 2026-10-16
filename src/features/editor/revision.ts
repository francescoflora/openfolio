import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { Schema } from 'prosemirror-model'

export const revisionKey = new PluginKey('revision')

/** While revision mode is on, every inserted character carries the revision mark. */
export function revisionPlugin(schema: Schema, isActive: () => boolean): Plugin {
  return new Plugin({
    key: revisionKey,
    appendTransaction(trs, _old, newState) {
      if (!isActive()) return null
      if (!trs.some((tr) => tr.docChanged)) return null
      const mark = schema.marks.revision
      if (!mark || newState.storedMarks?.[0]?.type === mark) return null
      const tr = newState.tr.setStoredMarks([mark.create()])
      tr.setMeta('addToHistory', false)
      return tr
    },
  })
}

export function applyRevisionToSelection(schema: Schema) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const mark = schema.marks.revision
    if (!mark) return false
    const { from, to, empty } = state.selection
    if (empty) {
      if (dispatch) dispatch(state.tr.setStoredMarks([mark.create()]))
      return true
    }
    const hasMark = state.doc.rangeHasMark(from, to, mark)
    if (hasMark) {
      if (dispatch) dispatch(state.tr.removeMark(from, to, mark))
      return true
    }
    if (dispatch) dispatch(state.tr.addMark(from, to, mark.create()))
    return true
  }
}

export function clearRevisions(schema: Schema) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const mark = schema.marks.revision
    if (!mark) return false
    if (dispatch) {
      const { from, to, empty } = state.selection
      const tr = empty
        ? state.tr.removeMark(0, state.doc.content.size, mark)
        : state.tr.removeMark(from, to, mark)
      tr.setMeta('addToHistory', true)
      dispatch(tr)
    }
    return true
  }
}
