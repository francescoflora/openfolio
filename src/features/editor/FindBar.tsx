import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { EditorView } from 'prosemirror-view'
import { TextSelection } from 'prosemirror-state'
import type { Command } from 'prosemirror-state'
import {
  SearchQuery,
  findNext,
  findPrev,
  getMatchHighlights,
  replaceAll,
  replaceNext,
  setSearchState,
} from 'prosemirror-search'
import { CaseSensitive, ChevronDown, ChevronRight, ChevronUp, Replace, ReplaceAll, WholeWord, X } from 'lucide-react'
import { uiText } from '@/core/i18n'
import type { Language } from '@/core/types'
import { cn } from '@/lib/cn'

interface FindBarProps {
  open: boolean
  replace: boolean
  onToggleReplace: () => void
  onClose: () => void
  viewRef: RefObject<EditorView | null>
  subscribe: (listener: () => void) => () => void
  lang: Language
}

export function FindBar({ open, replace, onToggleReplace, onClose, viewRef, subscribe, lang }: FindBarProps) {
  const t = uiText(lang)
  const inputRef = useRef<HTMLInputElement>(null)
  const moveKeyRef = useRef<string | null>(null)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [matches, setMatches] = useState({ total: 0, active: 0 })

  const refreshMatches = useCallback(() => {
    const view = viewRef.current
    if (!view) {
      setMatches({ total: 0, active: 0 })
      return
    }
    const highlights = getMatchHighlights(view.state).find()
    const selection = view.state.selection
    const active = highlights.findIndex((d) => d.from === selection.from && d.to === selection.to) + 1
    setMatches({ total: highlights.length, active })
  }, [viewRef])

  useEffect(() => {
    if (!open) return
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection
    if (from !== to) {
      const text = view.state.doc.textBetween(from, to, ' ')
      if (text && !text.includes('\n')) setQuery(text)
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open, viewRef])

  useEffect(() => {
    if (!open) {
      moveKeyRef.current = null
      return
    }
    const view = viewRef.current
    if (!view) return

    const moveKey = `${query}\u0000${caseSensitive}\u0000${wholeWord}`
    const shouldMove = moveKeyRef.current !== moveKey
    moveKeyRef.current = moveKey

    const search = new SearchQuery({ search: query, replace: replacement, caseSensitive, wholeWord })
    view.dispatch(setSearchState(view.state.tr, search))
    if (shouldMove && search.valid) {
      const selection = view.state.selection
      const containing = getMatchHighlights(view.state)
        .find()
        .find((d) => d.from <= selection.from && selection.to <= d.to && selection.from < d.to)
      if (containing) {
        if (containing.from !== selection.from || containing.to !== selection.to) {
          view.dispatch(
            view.state.tr.setSelection(TextSelection.create(view.state.doc, containing.from, containing.to)),
          )
        }
      } else {
        findNext(view.state, view.dispatch)
      }
    }
    refreshMatches()
  }, [open, query, replacement, caseSensitive, wholeWord, viewRef, refreshMatches])

  useEffect(() => {
    if (!open) return
    return subscribe(refreshMatches)
  }, [open, subscribe, refreshMatches])

  const run = (command: Command): boolean => {
    const view = viewRef.current
    if (!view) return false
    return command(view.state, view.dispatch)
  }

  const go = (direction: 1 | -1) => run(direction > 0 ? findNext : findPrev)

  const { total, active } = matches
  const disabled = query.trim().length === 0 || total === 0

  if (!open) return null

  return (
    <div
      data-findbar
      className="absolute right-3 top-11 z-30 w-[min(28rem,calc(100%-1.5rem))] rounded-lg border border-border bg-surface/95 p-2 shadow-xl backdrop-blur"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleReplace}
          title={t.toggleReplaceRow}
          aria-label={t.toggleReplaceRow}
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          {replace ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <input
          ref={inputRef}
          className="h-7 min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 text-sm text-ink outline-none focus:border-accent"
          placeholder={t.findPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              go(e.shiftKey ? -1 : 1)
            }
          }}
        />

        <span className="w-14 shrink-0 text-center text-xs tabular-nums text-ink-faint">
          {active} / {total}
        </span>

        <button
          type="button"
          onClick={() => go(-1)}
          disabled={disabled}
          title={t.findPrevTitle}
          aria-label={t.findPrevTitle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={disabled}
          title={t.findNextTitle}
          aria-label={t.findNextTitle}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCaseSensitive((v) => !v)}
          title={t.findMatchCase}
          aria-label={t.findMatchCase}
          aria-pressed={caseSensitive}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded transition',
            caseSensitive ? 'bg-accent/15 text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          <CaseSensitive className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setWholeWord((v) => !v)}
          title={t.findWholeWord}
          aria-label={t.findWholeWord}
          aria-pressed={wholeWord}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded transition',
            wholeWord ? 'bg-accent/15 text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          <WholeWord className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title={t.closeFind}
          aria-label={t.closeFind}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {replace && (
        <div className="mt-1 flex items-center gap-1 pl-6">
          <input
            className="h-7 min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 text-sm text-ink outline-none focus:border-accent"
            placeholder={t.replacePlaceholder}
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (e.ctrlKey || e.metaKey) run(replaceAll)
                else run(replaceNext)
              }
            }}
          />
          <button
            type="button"
            onClick={() => run(replaceNext)}
            disabled={disabled}
            title={t.replaceOneTitle}
            aria-label={t.replaceOneTitle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
          >
            <Replace className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => run(replaceAll)}
            disabled={disabled}
            title={t.replaceAllTitle}
            aria-label={t.replaceAllTitle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
          >
            <ReplaceAll className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
