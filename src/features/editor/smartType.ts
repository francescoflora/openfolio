import { Plugin, PluginKey } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import type { JSONContent, SceneDoc } from '@/core/json'

export interface Suggestion {
  items: string[]
  from: number
  to: number
  index: number
}

const EMPTY: Suggestion = { items: [], from: 0, to: 0, index: 0 }
export const smartTypeKey = new PluginKey<Suggestion>('smarttype')

export type SuggestionKind = 'character' | 'scene_heading'
type GetItems = (kind: SuggestionKind, prefix: string) => string[]

function compute(state: EditorState, getItems: GetItems): Suggestion {
  const sel = state.selection
  if (!sel.empty) return EMPTY
  const name = sel.$from.parent.type.name as SuggestionKind
  if (name !== 'character' && name !== 'scene_heading') return EMPTY
  const from = sel.$from.start()
  const to = sel.$from.pos
  const prefix = state.doc.textBetween(from, to)
  if (prefix.trim().length < 1) return EMPTY
  const items = getItems(name, prefix)
  return items.length ? { items, from, to, index: 0 } : EMPTY
}

export function smartTypePlugin(getItems: GetItems): Plugin<Suggestion> {
  return new Plugin<Suggestion>({
    key: smartTypeKey,
    state: {
      init: () => EMPTY,
      apply(tr, prev, _old, next) {
        const meta = tr.getMeta(smartTypeKey) as { move?: number; dismiss?: boolean } | undefined
        if (meta?.dismiss) return EMPTY
        if (meta?.move && prev.items.length) {
          const i = (prev.index + meta.move + prev.items.length) % prev.items.length
          return { ...prev, index: i }
        }
        if (!tr.docChanged && !tr.selectionSet) return prev
        return compute(next, getItems)
      },
    },
    props: {
      handleKeyDown(view, event) {
        const s = smartTypeKey.getState(view.state)
        if (!s || !s.items.length) return false
        if (event.key === 'ArrowDown') {
          view.dispatch(view.state.tr.setMeta(smartTypeKey, { move: 1 }))
          return true
        }
        if (event.key === 'ArrowUp') {
          view.dispatch(view.state.tr.setMeta(smartTypeKey, { move: -1 }))
          return true
        }
        if (event.key === 'Escape') {
          view.dispatch(view.state.tr.setMeta(smartTypeKey, { dismiss: true }))
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          const typed = view.state.doc.textBetween(s.from, s.to).trim().toUpperCase()
          if (typed === s.items[s.index]!.toUpperCase()) return false
          acceptSuggestion(view, s.index)
          return true
        }
        return false
      },
    },
  })
}

export function acceptSuggestion(view: EditorView, index: number): void {
  const s = smartTypeKey.getState(view.state)
  if (!s || !s.items.length) return
  const text = s.items[index] ?? s.items[0]!
  const tr: Transaction = view.state.tr.insertText(text, s.from, s.to)
  tr.setMeta(smartTypeKey, { dismiss: true })
  view.dispatch(tr)
  view.focus()
}

// ---------------------------------------------------------------------------
// Suggestion sources (cached per immutable SceneDoc via WeakMap)
// ---------------------------------------------------------------------------

const sceneCache = new WeakMap<SceneDoc, Record<SuggestionKind, string[]>>()

function extractFromScene(doc: SceneDoc): Record<SuggestionKind, string[]> {
  const cached = sceneCache.get(doc)
  if (cached) return cached
  const chars: string[] = []
  const headings: string[] = []
  const walk = (node: JSONContent) => {
    if (node.type === 'character' || node.type === 'scene_heading') {
      const text = (node.content ?? []).map((c) => c.text ?? '').join('').trim()
      if (text) {
        if (node.type === 'character') {
          const clean = text.replace(/\s*\((?:CONT'D|CONTINUED)\)/gi, '').trim().toUpperCase()
          if (clean) chars.push(clean)
        } else {
          headings.push(text.toUpperCase())
        }
      }
    }
    node.content?.forEach(walk)
  }
  walk(doc)
  const entry = { character: chars, scene_heading: headings }
  sceneCache.set(doc, entry)
  return entry
}

function collect(scenes: Record<string, SceneDoc>, kind: SuggestionKind): string[] {
  const found = new Set<string>()
  for (const doc of Object.values(scenes)) {
    for (const item of extractFromScene(doc)[kind]) found.add(item)
  }
  return [...found].sort()
}

export function makeGetItems(scenes: Record<string, SceneDoc>): GetItems {
  return (kind, prefix) => {
    const source = collect(scenes, kind)
    const p = prefix.trim().toUpperCase()
    return source.filter((item) => item.startsWith(p) && item !== p).slice(0, 8)
  }
}
