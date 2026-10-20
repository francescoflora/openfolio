import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Plugin, Transaction } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import type { Schema } from 'prosemirror-model'
import { baseKeymap, setBlockType } from 'prosemirror-commands'
import { history, redo, redoDepth, undo, undoDepth } from 'prosemirror-history'
import { keymap } from 'prosemirror-keymap'
import {
  AlignJustify,
  CheckCheck,
  Heading1,
  Highlighter,
  History,
  Indent,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pilcrow,
  Redo2,
  Type,
  Undo2,
} from 'lucide-react'
import { FontModal } from './FontModal'
import { SCREENPLAY_ELEMENTS, screenplaySchema } from '@/core/schema/screenplay'
import { proseSchema } from '@/core/schema/prose'
import { elementLabels, uiText } from '@/core/i18n'
import type { ProjectMode } from '@/core/types'
import type { SceneDoc } from '@/core/json'
import { defaultScene, useProject } from '@/store/useProject'
import { loadLastView, saveLastView } from '@/core/persistence'
import { enterKeymap, elementPlaceholders, hardBreakKeymap, makeSetType, parentheticalKeymap, parentheticalPlugin, placeholderPlugin, screenplayInputRules, tabKeymap } from './screenplayPlugins'
import { novelInputRules, novelKeymap } from './novelPlugins'
import { acceptSuggestion, makeGetItems, smartTypeKey, smartTypePlugin } from './smartType'
import type { Suggestion, SuggestionKind } from './smartType'
import { typographyPlugin } from './typography'
import { applyRevisionToSelection, clearRevisions, revisionPlugin } from './revision'
import { cn } from '@/lib/cn'

const liveGetItems = (kind: SuggestionKind, prefix: string) =>
  makeGetItems(useProject.getState().scenes)(kind, prefix)

const currentLang = () => useProject.getState().project?.settings.language ?? useProject.getState().language

function buildPlugins(mode: ProjectMode, schema: Schema): Plugin[] {
  const getAutoParen = () => useProject.getState().project?.settings.autoParentheses ?? true
  const getAutoContinued = () => useProject.getState().project?.settings.autoContinued ?? true
  const plugins: Plugin[] = [history(), revisionPlugin(schema, () => useProject.getState().revisionActive)]
  plugins.push(keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }))
  if (mode === 'screenplay') {
    plugins.push(smartTypePlugin(liveGetItems))
    plugins.push(keymap(parentheticalKeymap(schema, getAutoParen)))
    plugins.push(parentheticalPlugin(schema, getAutoParen))
    plugins.push(keymap(tabKeymap(schema)))
    plugins.push(keymap(enterKeymap(schema, getAutoParen, getAutoContinued)))
    plugins.push(screenplayInputRules(schema))
    plugins.push(placeholderPlugin(() => elementPlaceholders(currentLang())))
  } else {
    plugins.push(keymap(novelKeymap(schema)))
    plugins.push(novelInputRules(schema))
    plugins.push(
      placeholderPlugin(() => {
        const t = uiText(currentLang())
        return { heading: t.novelHeadingPlaceholder, paragraph: t.novelParagraphPlaceholder }
      }),
    )
  }
  plugins.push(typographyPlugin())
  plugins.push(keymap(hardBreakKeymap(schema)))
  plugins.push(keymap(baseKeymap))
  return plugins
}

interface Popup {
  items: string[]
  index: number
  top: number
  left: number
}

export function Editor({ sceneId, mode }: { sceneId: string; mode: ProjectMode }) {
  const ref = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [historyState, setHistoryState] = useState({ undo: false, redo: false })
  const projectId = useProject((s) => s.project?.id)
  const revisionActive = useProject((s) => s.revisionActive)
  const toggleRevision = useProject((s) => s.toggleRevision)
  const binderOpen = useProject((s) => s.binderOpen)
  const toggleBinder = useProject((s) => s.toggleBinder)
  const inspectorOpen = useProject((s) => s.inspectorOpen)
  const toggleInspector = useProject((s) => s.toggleInspector)
  const zoom = useProject((s) => s.zoom ?? 100)
  const currentElement = useProject((s) => s.currentElement)
  const appLanguage = useProject((s) => s.language)
  const dictionaryLanguage = useProject((s) => s.project?.settings.language ?? s.language)
  const spellcheck = useProject((s) => s.project?.settings.spellcheck) ?? true
  const justify = useProject((s) => s.project?.settings.justify) ?? (mode === 'novel')
  const indent = useProject((s) => s.project?.settings.indent) ?? (mode === 'novel')
  const elementFonts = useProject((s) => s.project?.settings.elementFonts)
  const updateSettings = useProject((s) => s.updateSettings)
  const t = uiText(appLanguage)

  const elementFontStyles = useMemo(() => {
    const styles: Record<string, string> = {}
    for (const [key, val] of Object.entries(elementFonts ?? {})) {
      if (val) styles[`--font-el-${key}`] = val
    }
    return styles
  }, [elementFonts])
  const labels = elementLabels(appLanguage)
  const schema = mode === 'screenplay' ? screenplaySchema : proseSchema

  const runCommand = (fn: (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean) => {
    const view = viewRef.current
    if (view) {
      fn(view.state, view.dispatch)
      view.focus()
    }
  }

  const changeElement = (name: string) => {
    const view = viewRef.current
    if (!view) return
    if (mode === 'screenplay') {
      makeSetType(schema, name)(view.state, view.dispatch)
      view.focus()
      return
    }
    const type = schema.nodes[name]
    if (type) setBlockType(type)(view.state, view.dispatch)
    view.focus()
  }

  const changeNovelBlock = (name: 'heading' | 'paragraph') => {
    const view = viewRef.current
    if (!view) return
    if (name === 'heading') {
      const heading = schema.nodes.heading
      if (heading) setBlockType(heading, { level: 1 })(view.state, view.dispatch)
    } else {
      const paragraph = schema.nodes.paragraph
      if (paragraph) setBlockType(paragraph)(view.state, view.dispatch)
    }
    view.focus()
  }

  useEffect(() => {
    const el = ref.current
    if (!el || !sceneId) return
    const schema = mode === 'screenplay' ? screenplaySchema : proseSchema
    const initLang = currentLang()
    const initSpell = useProject.getState().project?.settings.spellcheck ?? true
    const docJson = useProject.getState().scenes[sceneId] ?? defaultScene(mode, initLang)
    const doc = schema.nodeFromJSON(docJson)

    let selection: TextSelection | undefined
    if (mode === 'novel') {
      let paragraphPos: number | null = null
      doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && paragraphPos === null) {
          paragraphPos = pos + 1
          return false
        }
        return true
      })
      if (paragraphPos !== null) {
        selection = TextSelection.create(doc, paragraphPos)
      }
    }

    const state = EditorState.create({
      doc,
      selection,
      plugins: buildPlugins(mode, schema),
    })

    let view: EditorView

    const syncElement = (s: EditorState) => {
      useProject.getState().setCurrentElement(s.selection.$from.parent.type.name)
    }

    const syncHistory = (s: EditorState) => {
      const canUndo = undoDepth(s) > 0
      const canRedo = redoDepth(s) > 0
      setHistoryState((prev) => (prev.undo === canUndo && prev.redo === canRedo ? prev : { undo: canUndo, redo: canRedo }))
    }

    const syncPopup = (s: EditorState) => {
      if (mode !== 'screenplay') return
      const sug = smartTypeKey.getState(s) as Suggestion | undefined
      if (!sug || !sug.items.length) {
        setPopup(null)
        return
      }
      const coords = view.coordsAtPos(sug.to)
      setPopup({ items: sug.items, index: sug.index, top: coords.bottom + 4, left: coords.left })
    }

    view = new EditorView(el, {
      state,
      attributes: { spellcheck: initSpell ? 'true' : 'false', lang: initLang },
      dispatchTransaction(tr) {
        const next = view.state.apply(tr)
        view.updateState(next)
        if (tr.docChanged) {
          useProject.getState().updateScene(sceneId, next.doc.toJSON() as SceneDoc)
        }
        syncElement(next)
        syncHistory(next)
        syncPopup(next)
      },
    })
    viewRef.current = view
    syncElement(view.state)
    syncHistory(view.state)
    view.focus()

    return () => {
      view.destroy()
      viewRef.current = null
      setPopup(null)
    }
  }, [sceneId, mode])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.setProps({ attributes: { spellcheck: spellcheck ? 'true' : 'false', lang: dictionaryLanguage } })
    view.dispatch(view.state.tr)
  }, [dictionaryLanguage, spellcheck])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !projectId) return
    const saved = loadLastView(projectId)
    if (saved && saved.sceneId === sceneId) {
      requestAnimationFrame(() => {
        el.scrollTop = saved.scrollTop
      })
    }
    return () => {
      saveLastView(projectId, { sceneId, scrollTop: el.scrollTop })
    }
  }, [sceneId, projectId])

  const handleScroll = () => {
    if (!projectId) return
    clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      const el = scrollRef.current
      if (el) saveLastView(projectId, { sceneId, scrollTop: el.scrollTop })
    }, 250)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 5 : -5
        useProject.getState().setZoom(useProject.getState().zoom + delta)
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-canvas">
      <div className="relative flex h-9 shrink-0 items-center justify-between border-b border-border bg-surface px-3 text-xs">
        {/* Left: Binder Toggle & Element Selector / Block switch */}
        <div className="z-10 flex items-center gap-1.5 shrink-0">
          <button
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer select-none',
              binderOpen
                ? 'border-accent/50 bg-accent/15 text-accent shadow-xs'
                : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
            )}
            onClick={toggleBinder}
            title={binderOpen ? t.closeBinderTitle : t.openBinderTitle}
            aria-label={binderOpen ? t.closeBinderTitle : t.openBinderTitle}
          >
            {binderOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          {mode === 'screenplay' ? (
            <select
              className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs font-medium text-ink outline-none transition hover:border-border-strong focus:border-accent"
              value={currentElement ?? 'action'}
              onChange={(e) => changeElement(e.target.value)}
              title={t.elementSelectTitle}
            >
              {SCREENPLAY_ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {labels[el]}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-0.5 rounded-md border border-border/80 bg-surface-2 p-0.5">
              <button
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition cursor-pointer',
                  currentElement === 'heading'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
                onClick={() => changeNovelBlock('heading')}
                title={t.chapterBtnTitle}
              >
                <Heading1 className="h-3.5 w-3.5" />
                <span>{t.chapterBtn}</span>
              </button>
              <button
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition cursor-pointer',
                  currentElement === 'paragraph' || !currentElement
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
                onClick={() => changeNovelBlock('paragraph')}
                title={t.paragraphBtnTitle}
              >
                <Pilcrow className="h-3.5 w-3.5" />
                <span>{t.paragraphBtn}</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Formatting, Undo/Redo & Revision Icons (perfettamente centrato a 50%) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center">
          <div className="pointer-events-auto flex items-center justify-center gap-1">
            {mode === 'novel' && (
              <>
                {/* Giustificato */}
                <button
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer',
                    justify
                      ? 'border-accent/40 bg-accent/15 text-accent shadow-xs'
                      : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )}
                  onClick={() => updateSettings({ justify: !justify })}
                  title={t.justifyTitle(justify)}
                  aria-label={t.justifyTitle(justify)}
                >
                  <AlignJustify className="h-4 w-4" />
                </button>

                {/* Indentazione */}
                <button
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer',
                    indent
                      ? 'border-accent/40 bg-accent/15 text-accent shadow-xs'
                      : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
                  )}
                  onClick={() => updateSettings({ indent: !indent })}
                  title={t.indentTitle(indent)}
                  aria-label={t.indentTitle(indent)}
                >
                  <Indent className="h-4 w-4" />
                </button>

                <div className="mx-1 h-3.5 w-px bg-border" />
              </>
            )}

            {/* Annulla (Undo) */}
            <button
              type="button"
              disabled={!historyState.undo}
              onClick={() => runCommand(undo)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-ink-muted transition hover:bg-surface-2 hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.undoTitle}
              aria-label={t.undoTitle}
            >
              <Undo2 className="h-4 w-4" />
            </button>

            {/* Ripeti (Redo) */}
            <button
              type="button"
              disabled={!historyState.redo}
              onClick={() => runCommand(redo)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-ink-muted transition hover:bg-surface-2 hover:text-ink cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.redoTitle}
              aria-label={t.redoTitle}
            >
              <Redo2 className="h-4 w-4" />
            </button>

            {/* Tipografia elementi / Font (Tt) */}
            <button
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer select-none',
                fontModalOpen
                  ? 'border-accent/50 bg-accent/15 text-accent shadow-xs'
                  : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
              )}
              onClick={() => setFontModalOpen(true)}
              title={t.fontModalBtnTitle}
              aria-label={t.fontModalBtnTitle}
            >
              <Type className="h-4 w-4" />
            </button>

            <div className="mx-1 h-3.5 w-px bg-border" />

            {/* Modalità Revisione */}
            <button
              className={cn(
                'relative flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer',
                revisionActive
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
              )}
              onClick={toggleRevision}
              title={t.revisionTitle(revisionActive)}
              aria-label={t.revisionTitle(revisionActive)}
            >
              <History className="h-4 w-4" />
              {revisionActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface animate-pulse" />
              )}
            </button>

            {/* Segna selezione */}
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-ink-muted transition hover:bg-surface-2 hover:text-ink cursor-pointer"
              onClick={() => runCommand(applyRevisionToSelection(schema))}
              title={t.markRevisionTitle}
              aria-label={t.markRevisionTitle}
            >
              <Highlighter className="h-4 w-4" />
            </button>

            {/* Accetta tutte le revisioni */}
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-ink-muted transition hover:bg-surface-2 hover:text-ink cursor-pointer"
              onClick={() => runCommand(clearRevisions(schema))}
              title={t.clearRevisionsTitle}
              aria-label={t.clearRevisionsTitle}
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: Notes Sidebar Toggle */}
        <div className="z-10 flex items-center shrink-0">
          <button
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md border transition cursor-pointer select-none',
              inspectorOpen
                ? 'border-accent/50 bg-accent/15 text-accent shadow-xs'
                : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
            )}
            onClick={toggleInspector}
            title={inspectorOpen ? t.closeNotesTitle : t.openNotesTitle}
            aria-label={inspectorOpen ? t.closeNotesTitle : t.openNotesTitle}
          >
            {inspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto py-8" ref={scrollRef} onScroll={handleScroll}>
        <div
          style={{ zoom: `${zoom}%` }}
          className={
            mode === 'screenplay'
              ? 'mx-auto w-[8.5in] shrink-0 rounded-[2px] bg-surface px-[1in] py-[1in] shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_12px_36px_-6px_rgba(0,0,0,0.1)] ring-1 ring-border/80 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_40px_-8px_rgba(0,0,0,0.6)]'
              : 'mx-auto w-[7.5in] max-w-[calc(100%_-_4rem)] rounded-[2px] bg-surface px-[1in] py-[1in] shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_12px_36px_-6px_rgba(0,0,0,0.1)] ring-1 ring-border/80 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_40px_-8px_rgba(0,0,0,0.6)]'
          }
        >
          <div
            ref={ref}
            style={elementFontStyles as React.CSSProperties}
            className={
              mode === 'screenplay'
                ? 'script-page min-h-[9in]'
                : cn(
                    'novel-page min-h-[9in]',
                    justify && 'text-justify',
                    indent ? 'with-indent' : 'no-indent',
                  )
            }
          />
        </div>

      {popup && (
        <ul
          className="fixed z-30 max-h-64 w-56 overflow-auto rounded-lg border border-border bg-surface py-1 shadow-xl"
          style={{ top: popup.top, left: popup.left }}
        >
          {popup.items.map((item, i) => (
            <li key={item}>
              <button
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === popup.index ? 'bg-accent/12 text-ink' : 'text-ink-soft hover:bg-surface-2'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (viewRef.current) acceptSuggestion(viewRef.current, i)
                  setPopup(null)
                }}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>

      <FontModal
        isOpen={fontModalOpen}
        onClose={() => setFontModalOpen(false)}
        mode={mode}
      />
    </div>
  )
}
