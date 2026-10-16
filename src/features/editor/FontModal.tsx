import { useEffect, useState } from 'react'
import { RotateCcw, Type, X } from 'lucide-react'
import { useProject } from '@/store/useProject'
import {
  loadDefaultAutoParentheses,
  loadDefaultElementFonts,
  resetDefaultAutoParentheses,
  resetDefaultElementFonts,
  saveDefaultAutoParentheses,
  saveDefaultElementFonts,
} from '@/core/persistence'
import { elementLabels, uiText } from '@/core/i18n'
import type { ElementType } from '@/core/schema/screenplay'
import type { ProjectMode } from '@/core/types'

export interface FontOption {
  id: string
  label: string
}

export const AVAILABLE_FONTS: FontOption[] = [
  { id: '', label: 'Predefinito' },
  { id: "'Courier Prime', 'Courier New', monospace", label: 'Courier Prime (Macchina da scrivere)' },
  { id: "'Courier New', Courier, monospace", label: 'Courier New (Monospazio)' },
  { id: "'EB Garamond', 'Lora', Georgia, serif", label: 'EB Garamond (Classico Editoriale)' },
  { id: "'Lora', Georgia, serif", label: 'Lora (Serif Caldo)' },
  { id: 'Georgia, serif', label: 'Georgia (Serif Leggibile)' },
  { id: "'Times New Roman', Times, serif", label: 'Times New Roman (Serif Tradizionale)' },
  { id: 'Cambria, Georgia, serif', label: 'Cambria (Serif Moderno)' },
  { id: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", label: 'Palatino Linotype (Serif)' },
  { id: "'Inter', ui-sans-serif, system-ui, sans-serif", label: 'Inter (Sans-Serif Pulito)' },
  { id: "'Outfit', 'Inter', sans-serif", label: 'Outfit (Sans-Serif Geometrico)' },
  { id: 'Arial, Helvetica, sans-serif', label: 'Arial (Sans-Serif Neutro)' },
  { id: "'Trebuchet MS', sans-serif", label: 'Trebuchet MS (Sans-Serif)' },
]

interface ElementDef {
  id: string
  label: string
  sample: string
  defaultFontLabel: string
  defaultFontFamily: string
  italic?: boolean
  uppercase?: boolean
  bold?: boolean
}

const SCREENPLAY_ELEMENTS_DEF: ElementDef[] = [
  {
    id: 'scene_heading',
    label: 'Intestazione scena',
    sample: 'INT. UFFICIO - GIORNO',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    uppercase: true,
    bold: true,
  },
  {
    id: 'action',
    label: 'Azione',
    sample: 'Marco apre la cartella e osserva i documenti riservati sul tavolo.',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
  },
  {
    id: 'shot',
    label: 'Inquadratura',
    sample: 'DETTAGLIO - LA BUSTA SIGILLATA',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    uppercase: true,
    bold: true,
  },
  {
    id: 'character',
    label: 'Personaggio',
    sample: 'MARCO',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    uppercase: true,
    bold: true,
  },
  {
    id: 'parenthetical',
    label: 'Parentetica',
    sample: '(sottovoce, indicando la porta)',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    italic: true,
  },
  {
    id: 'dialogue',
    label: 'Dialogo',
    sample: 'Dobbiamo fare silenzio. Non siamo soli in questo edificio.',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
  },
  {
    id: 'transition',
    label: 'Transizione',
    sample: 'STACCO SU:',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    uppercase: true,
    bold: true,
  },
]

const NOVEL_ELEMENTS_DEF: ElementDef[] = [
  {
    id: 'heading',
    label: 'Capitolo / Titolo',
    sample: 'CAPITOLO PRIMO',
    defaultFontLabel: 'EB Garamond',
    defaultFontFamily: "'EB Garamond', 'Lora', Cambria, 'Times New Roman', serif",
    uppercase: true,
    bold: true,
  },
  {
    id: 'paragraph',
    label: 'Paragrafo',
    sample: 'La pioggia autunnale batteva sui vetri della biblioteca con un ritmo sommesso.',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
  },
  {
    id: 'blockquote',
    label: 'Citazione',
    sample: '«Le parole hanno il potere di cambiare il destino di chi ascolta.»',
    defaultFontLabel: 'Courier Prime',
    defaultFontFamily: "'Courier Prime', 'Courier New', monospace",
    italic: true,
  },
]

export function FontModal({
  isOpen,
  onClose,
  mode,
}: {
  isOpen: boolean
  onClose: () => void
  mode: ProjectMode
}) {
  const [resetNotice, setResetNotice] = useState(false)
  const project = useProject((s) => s.project)
  const updateSettings = useProject((s) => s.updateSettings)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !project) return null

  const lang = project.settings.language ?? 'it'
  const t = uiText(lang)
  const elLabels = elementLabels(lang)
  const elementFonts = project.settings.elementFonts ?? {}
  const autoParentheses = project.settings.autoParentheses ?? true
  const elements = mode === 'screenplay' ? SCREENPLAY_ELEMENTS_DEF : NOVEL_ELEMENTS_DEF
  const novelLabels: Record<string, string> =
    lang === 'en'
      ? { heading: 'Chapter / Title', paragraph: 'Paragraph', blockquote: 'Quote' }
      : { heading: 'Capitolo / Titolo', paragraph: 'Paragrafo', blockquote: 'Citazione' }

  const handleSelectFont = (elementId: string, fontValue: string) => {
    const next = { ...elementFonts }
    if (fontValue) {
      next[elementId] = fontValue
    } else {
      delete next[elementId]
    }
    // Mantieni la scelta per il progetto
    updateSettings({ elementFonts: next })
    // Mantieni la scelta come predefinita anche per lo strumento
    saveDefaultElementFonts(mode, next)
    setResetNotice(false)
  }

  const handleToggleAutoParentheses = (enabled: boolean) => {
    updateSettings({ autoParentheses: enabled })
    saveDefaultAutoParentheses(enabled)
    setResetNotice(false)
  }

  const handleResetSoftwareDefaults = () => {
    const next = { ...elementFonts }
    for (const el of elements) {
      delete next[el.id]
    }
    // Ripristina ai valori predefiniti del software per il progetto
    updateSettings({ elementFonts: next, autoParentheses: true })
    // Ripristina i valori predefiniti del software per lo strumento (localStorage)
    resetDefaultElementFonts(mode)
    resetDefaultAutoParentheses()
    setResetNotice(true)
    setTimeout(() => setResetNotice(false), 2500)
  }

  const hasCustomSettings =
    elements.some((el) => Boolean(elementFonts[el.id])) ||
    Object.keys(loadDefaultElementFonts(mode)).length > 0 ||
    (mode === 'screenplay' && (!autoParentheses || !loadDefaultAutoParentheses()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-2/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Type className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">{t.fontModalTitle}</h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-soft border border-border">
                  {mode === 'screenplay' ? t.modeScreenplay : t.modeNovel}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {t.fontModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition hover:bg-surface-2 hover:text-ink cursor-pointer"
            title={t.closeBtn}
            aria-label={t.closeBtn}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Elements list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {elements.map((el) => {
            const currentFont = elementFonts[el.id] || ''
            const activeFontFamily = currentFont || el.defaultFontFamily
            const displayLabel =
              mode === 'screenplay' ? (elLabels[el.id as ElementType] ?? el.label) : (novelLabels[el.id] ?? el.label)

            return (
              <div
                key={el.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/30 p-3 transition hover:border-border/80"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">{displayLabel}</span>
                    <span className="text-[11px] text-ink-muted">
                      ({t.defaultFontOption}: {el.defaultFontLabel})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={currentFont}
                      onChange={(e) => handleSelectFont(el.id, e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-ink shadow-2xs outline-none transition focus:border-accent cursor-pointer"
                    >
                      {AVAILABLE_FONTS.map((font) => (
                        <option
                          key={font.id}
                          value={font.id}
                          style={font.id ? { fontFamily: font.id } : undefined}
                        >
                          {font.id === '' ? `${t.defaultFontOption} (${el.defaultFontLabel})` : font.label}
                        </option>
                      ))}
                    </select>

                    {currentFont && (
                      <button
                        onClick={() => handleSelectFont(el.id, '')}
                        className="h-8 px-2 text-[11px] text-ink-muted hover:text-accent hover:bg-surface rounded-md border border-transparent hover:border-border transition cursor-pointer"
                        title={t.resetBtn}
                      >
                        {t.resetBtn}
                      </button>
                    )}
                  </div>
                </div>

                {/* Opzione parentesi automatiche per la parentetica */}
                {el.id === 'parenthetical' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface/80 px-3 py-2 border border-border/60">
                    <label
                      htmlFor="auto-parentheses-checkbox"
                      className="flex items-center gap-2.5 text-xs text-ink cursor-pointer select-none"
                    >
                      <input
                        id="auto-parentheses-checkbox"
                        type="checkbox"
                        checked={autoParentheses}
                        onChange={(e) => handleToggleAutoParentheses(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer accent-accent"
                      />
                      <span className="font-medium">{t.autoParenLabel}</span>
                    </label>
                    <span className="text-[11px] font-medium text-ink-muted">
                      {autoParentheses ? t.autoParenActive : t.autoParenInactive}
                    </span>
                  </div>
                )}

                {/* Live Preview Strip */}
                <div
                  className="rounded-md border border-border/60 bg-surface px-3 py-2 text-ink text-xs transition"
                  style={{
                    fontFamily: activeFontFamily,
                    fontStyle: el.italic ? 'italic' : 'normal',
                    fontWeight: el.bold ? 700 : 400,
                    textTransform: el.uppercase ? 'uppercase' : 'none',
                    letterSpacing: el.uppercase ? '0.04em' : 'normal',
                  }}
                >
                  {el.id === 'parenthetical'
                    ? (autoParentheses ? '(sottovoce, indicando la porta)' : 'sottovoce, indicando la porta')
                    : el.sample}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-surface-2/40">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleResetSoftwareDefaults}
              disabled={!hasCustomSettings}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer border ${
                hasCustomSettings
                  ? 'border-border bg-surface text-ink hover:bg-surface-2 hover:border-accent/40 shadow-2xs'
                  : 'border-transparent text-ink-muted/50 cursor-not-allowed opacity-50'
              }`}
              title={t.resetSettingsTitle}
              aria-label={t.resetSettingsTitle}
            >
              <RotateCcw className="h-3.5 w-3.5 text-accent" />
              <span>{t.resetSettingsBtn}</span>
            </button>
            {resetNotice && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {t.resetSettingsNotice}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink shadow-xs transition hover:opacity-90 cursor-pointer"
          >
            {t.doneBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

