import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node as PMNode } from 'prosemirror-model'

export interface SpellChecker {
  correct(word: string): boolean
}

export const spellcheckKey = new PluginKey('spellcheck')

const WORD_RE = /[\p{L}][\p{L}'’-]*/gu

const SKIP_NODES = new Set(['character', 'transition', 'shot'])

export function collectMisspellings(
  doc: PMNode,
  checker: SpellChecker,
  skip: Set<string> = SKIP_NODES,
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = []
  doc.descendants((node, pos) => {
    if (skip.has(node.type.name)) return false
    if (!node.isText || !node.text) return true
    for (const match of node.text.matchAll(WORD_RE)) {
      const word = match[0]
      if (word.length < 2) continue
      if (!checker.correct(word.replace(/[’]/g, "'"))) {
        const from = pos + (match.index ?? 0)
        out.push({ from, to: from + word.length })
      }
    }
    return true
  })
  return out
}

export function spellcheckPlugin(isEnabled: () => boolean, getChecker: () => SpellChecker | null): Plugin {
  // ponytail: full-document rescan per change; switch to incremental/debounced checking if long scenes lag.
  let cachedDoc: PMNode | null = null
  let cachedChecker: SpellChecker | null = null
  let cached = DecorationSet.empty

  return new Plugin({
    key: spellcheckKey,
    props: {
      decorations(state: EditorState) {
        const checker = isEnabled() ? getChecker() : null
        if (!checker) {
          cachedDoc = null
          cachedChecker = null
          cached = DecorationSet.empty
          return cached
        }
        if (state.doc === cachedDoc && checker === cachedChecker) return cached
        cachedDoc = state.doc
        cachedChecker = checker
        cached = DecorationSet.create(
          state.doc,
          collectMisspellings(state.doc, checker).map(({ from, to }) =>
            Decoration.inline(from, to, { class: 'spell-error' }),
          ),
        )
        return cached
      },
    },
  })
}
