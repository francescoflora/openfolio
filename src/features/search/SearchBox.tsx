import { useState } from 'react'
import { Search } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { searchProject } from '@/core/search'
import { uiText } from '@/core/i18n'

export function SearchBox() {
  const lang = useProject((s) => s.language)
  const select = useProject((s) => s.select)
  const setView = useProject((s) => s.setView)
  const [query, setQuery] = useState('')
  const t = uiText(lang)

  const open = query.trim().length >= 2
  const hits = open
    ? (() => {
        const { project, scenes } = useProject.getState()
        return project ? searchProject(project, scenes, query) : []
      })()
    : []

  const go = (id: string) => {
    select(id)
    setView('editor')
    setQuery('')
  }

  return (
    <div className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
        <input
          className="w-full min-w-0 bg-transparent text-sm outline-none"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) go(hits[0].sceneId)
            if (e.key === 'Escape') setQuery('')
          }}
        />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setQuery('')} />
          <div className="absolute inset-x-0 top-9 z-20 max-h-80 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
            {hits.length === 0 && <div className="px-3 py-2 text-xs text-ink-faint">{t.noResults}</div>}
            {hits.map((h) => (
              <button
                key={h.sceneId}
                className="block w-full px-3 py-2 text-left hover:bg-surface-2 cursor-pointer"
                onClick={() => go(h.sceneId)}
              >
                <div className="text-sm font-medium text-ink">{h.sceneTitle}</div>
                {h.snippet && <div className="truncate text-xs text-ink-faint">{h.snippet}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
