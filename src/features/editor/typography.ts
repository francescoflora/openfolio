import { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

function insertQuote(
  view: EditorView,
  quote: string,
  duplicateGuard: string,
  explicitFrom?: number,
  explicitTo?: number,
): boolean {
  const { state, dispatch } = view
  const from = explicitFrom !== undefined ? explicitFrom : state.selection.from
  const to = explicitTo !== undefined ? explicitTo : state.selection.to

  // Guard against rapid double-tap or upgrading an existing raw < / >
  if (from === to && from > 0) {
    const $pos = state.doc.resolve(from)
    const offset = $pos.parentOffset
    if (offset > 0) {
      const prevChar = $pos.parent.textBetween(offset - 1, offset)
      if (prevChar === duplicateGuard) {
        // Already has « or », absorb the second press cleanly
        return true
      }
      if (duplicateGuard === '«' && prevChar === '<') {
        // User had `<` and types `<`: replace `<` with `«`
        const tr = state.tr.insertText('«', from - 1, from)
        dispatch(tr.scrollIntoView())
        return true
      }
      if (duplicateGuard === '»' && prevChar === '>') {
        // User had `>` and types `>`: replace `>` with `»`
        const tr = state.tr.insertText('»', from - 1, from)
        dispatch(tr.scrollIntoView())
        return true
      }
    }
  }

  const tr = state.tr.insertText(quote, from, to)
  dispatch(tr.scrollIntoView())
  return true
}

/**
 * Italian caporali (guillemets):
 * - Pressing `<` immediately produces `«` (both via keydown and textInput).
 * - Pressing `>` immediately produces `»`.
 * - Typing `<<` or `>>` in rapid succession absorbs the second tap cleanly.
 * - Handles physical keyboard keydown with preventDefault so `<` can never leak through,
 *   even if Windows IME / WebView2 composition or spellcheck is temporarily active.
 */
export function typographyPlugin(): Plugin {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.ctrlKey || event.altKey || event.metaKey) return false

        if (event.key === '<') {
          event.preventDefault()
          return insertQuote(view, '«', '«')
        }

        if (event.key === '>') {
          event.preventDefault()
          return insertQuote(view, '»', '»')
        }

        return false
      },

      handleTextInput(view, from, to, text) {
        if (text === '<') {
          return insertQuote(view, '«', '«', from, to)
        }
        if (text === '>') {
          return insertQuote(view, '»', '»', from, to)
        }
        return false
      },
    },
  })
}
