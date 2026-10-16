import { useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { findNode, flatten } from '@/core/tree'
import { countChars, countWords } from '@/core/stats'
import { uiText } from '@/core/i18n'

export function StatusBar() {
  const binder = useProject((s) => s.project?.binder)
  const mode = useProject((s) => s.project?.mode)
  const lang = useProject((s) => s.language)
  const selectedId = useProject((s) => s.selectedId)
  const zoom = useProject((s) => s.zoom ?? 100)
  const setZoom = useProject((s) => s.setZoom)
  const t = uiText(lang)
  const locale = lang === 'en' ? 'en-US' : 'it-IT'

  const { sceneCount, totalWords, totalChars, totalCartelle } = useMemo(() => {
    if (!binder) return { sceneCount: 0, totalWords: 0, totalChars: 0, totalCartelle: '0' }
    const scenes = useProject.getState().scenes
    let count = 0
    let words = 0
    let chars = 0
    for (const { node } of flatten(binder)) {
      if (node.kind !== 'scene') continue
      count++
      const doc = scenes[node.id]
      words += node.metadata.wordCount ?? (doc ? countWords(doc) : 0)
      chars += node.metadata.charCount ?? (doc ? countChars(doc) : 0)
    }
    const cartelle = (chars / 1800).toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
    return {
      sceneCount: count,
      totalWords: words,
      totalChars: chars,
      totalCartelle: cartelle,
    }
  }, [binder, locale])

  const current = selectedId && binder ? findNode(binder, selectedId) : null
  const currentDoc = selectedId && current && (current.metadata.wordCount === undefined || current.metadata.charCount === undefined)
    ? useProject.getState().scenes[selectedId]
    : null
  const currentWords = current?.metadata.wordCount ?? (currentDoc ? countWords(currentDoc) : 0)
  const currentChars = current?.metadata.charCount ?? (currentDoc ? countChars(currentDoc) : 0)

  return (
    <footer className="relative flex h-7 shrink-0 items-center justify-between overflow-hidden whitespace-nowrap border-t border-border bg-surface px-3 text-[11px] text-ink-faint select-none">
      {/* Left side: Totali del progetto */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="shrink-0">
          {sceneCount} {mode === 'novel' ? (sceneCount === 1 ? t.chapterSingular : t.chapterPlural) : (sceneCount === 1 ? t.sceneSingular : t.scenePlural)}
        </span>
        <span className="text-border">·</span>
        <span className="shrink-0">{totalWords.toLocaleString(locale)} {t.wordsUnit}</span>
        <span className="text-border">·</span>
        <span className="shrink-0">{totalChars.toLocaleString(locale)} {t.charsUnit}</span>
        <span className="text-border">·</span>
        <span className="shrink-0" title={t.pagesTitle}>
          {totalCartelle} {t.pagesUnit}
        </span>
      </div>

      {/* Center: Conteggio parole e battute per capitolo / scena */}
      {current && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 text-ink-soft pointer-events-none truncate max-w-[36%]">
          <span className="truncate">{current.title?.toLowerCase()}</span>
          <span className="text-border">|</span>
          <span>{currentWords.toLocaleString(locale)} {t.wordsUnit}</span>
          <span className="text-border">·</span>
          <span>{currentChars.toLocaleString(locale)} {t.charsUnit}</span>
        </div>
      )}

      {/* Right side: Word-style Zoom control + Mode indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Word-style Zoom Control */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded text-ink-faint transition hover:bg-surface-2 hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => setZoom(zoom - 10)}
            disabled={zoom <= 50}
            title={t.zoomOutTitle}
            aria-label={t.zoomOutTitle}
          >
            <Minus className="h-3 w-3" />
          </button>

          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 w-16 md:w-20 cursor-pointer appearance-none rounded-full bg-border accent-amber-500 focus:outline-none"
            title={t.zoomPageTitle(zoom)}
            aria-label={t.zoomPageTitle(zoom)}
          />

          <button
            type="button"
            className="flex h-4 w-4 items-center justify-center rounded text-ink-faint transition hover:bg-surface-2 hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => setZoom(zoom + 10)}
            disabled={zoom >= 200}
            title={t.zoomInTitle}
            aria-label={t.zoomInTitle}
          >
            <Plus className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(100)}
            className="w-10 text-right font-medium text-ink-soft transition hover:text-ink cursor-pointer tabular-nums"
            title={t.zoomResetTitle}
            aria-label={t.zoomResetTitle}
          >
            {zoom}%
          </button>
        </div>

        <span className="h-3 w-px bg-border" />

        <span className="shrink-0 font-medium text-ink-soft">
          {mode === 'screenplay' ? t.modeScreenplay : t.modeNovel}
        </span>
      </div>
    </footer>
  )
}
