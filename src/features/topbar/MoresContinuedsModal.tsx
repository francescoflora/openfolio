import { useEffect, useState } from 'react'
import { Check, MessageSquareText, RotateCcw, X } from 'lucide-react'
import { useProject } from '@/store/useProject'
import {
  loadDefaultAutoContinued,
  resetDefaultAutoContinued,
  saveDefaultAutoContinued,
} from '@/core/persistence'
import { uiText } from '@/core/i18n'

export function MoresContinuedsModal({ onClose }: { onClose: () => void }) {
  const project = useProject((s) => s.project)
  const updateSettings = useProject((s) => s.updateSettings)
  const lang = useProject((s) => s.language)
  const t = uiText(lang)

  const [saveAsDefault, setSaveAsDefault] = useState(true)
  const [resetNotice, setResetNotice] = useState(false)

  const autoContinued = project?.settings.autoContinued ?? true

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!project) return null

  const handleToggle = (enabled: boolean) => {
    updateSettings({ autoContinued: enabled })
    if (saveAsDefault) {
      saveDefaultAutoContinued(enabled)
    }
    setResetNotice(false)
  }

  const handleResetDefaults = () => {
    updateSettings({ autoContinued: true })
    resetDefaultAutoContinued()
    setResetNotice(true)
    setTimeout(() => setResetNotice(false), 2500)
  }

  const isCustomized = !autoContinued || !loadDefaultAutoContinued()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-label={t.moresModalTitle}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-surface-2/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink leading-tight">{t.moresModalTitle}</h2>
              <p className="text-[11px] text-ink-muted leading-none mt-0.5">{t.moresModalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted hover:bg-surface-2 hover:text-ink transition cursor-pointer"
            title={t.doneBtn}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Main Setting Box */}
          <div className="rounded-lg border border-border bg-surface-2/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <label
                htmlFor="modal-auto-continued"
                className="flex items-start gap-3 cursor-pointer select-none"
              >
                <input
                  id="modal-auto-continued"
                  type="checkbox"
                  checked={autoContinued}
                  onChange={(e) => handleToggle(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer accent-accent"
                />
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    {t.moresModalAutoContLabel}
                  </span>
                  <span className="text-xs text-ink-muted block mt-1 leading-relaxed">
                    {t.moresModalAutoContDesc}
                  </span>
                </div>
              </label>
              <span
                className={`text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full border ${
                  autoContinued
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border bg-surface text-ink-muted'
                }`}
              >
                {autoContinued ? t.autoContinuedActive : t.autoContinuedInactive}
              </span>
            </div>

            {/* Checkbox per rendere predefinita la scelta */}
            <div className="pt-2 border-t border-border/60">
              <label
                htmlFor="modal-save-default"
                className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer select-none"
              >
                <input
                  id="modal-save-default"
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => {
                    const next = e.target.checked
                    setSaveAsDefault(next)
                    if (next) saveDefaultAutoContinued(autoContinued)
                  }}
                  className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent cursor-pointer accent-accent"
                />
                <span>{t.moresModalSaveDefault}</span>
              </label>
            </div>
          </div>

          {/* Practical Example Box */}
          <div className="rounded-lg border border-border/70 bg-surface p-4 text-xs space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t.moresModalExampleTitle}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="rounded-md border border-border/50 bg-surface-2/50 p-2.5 font-mono text-[11px] space-y-1">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-ink-muted block">
                  {t.moresModalExampleTyped}
                </span>
                <p className="font-bold text-ink">MARCO</p>
                <p className="text-ink-muted pl-4">Non posso crederci.</p>
                <p className="text-ink-faint italic">Marco si alza e guarda fuori.</p>
                <p className="font-bold text-ink">MARCO</p>
                <p className="text-ink-muted pl-4">Dopo tutto quello che...</p>
              </div>

              <div className="rounded-md border border-accent/30 bg-accent/5 p-2.5 font-mono text-[11px] space-y-1">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-accent block">
                  {t.moresModalExampleResult}
                </span>
                <p className="font-bold text-ink">MARCO</p>
                <p className="text-ink-muted pl-4">Non posso crederci.</p>
                <p className="text-ink-faint italic">Marco si alza e guarda fuori.</p>
                <p className="font-bold text-accent">
                  MARCO {autoContinued ? "(CONT'D)" : ''}
                </p>
                <p className="text-ink-muted pl-4">Dopo tutto quello che...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-surface-2/40">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={!isCustomized}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer border ${
                isCustomized
                  ? 'border-border bg-surface text-ink hover:bg-surface-2 hover:border-accent/40 shadow-2xs'
                  : 'border-transparent text-ink-muted/50 cursor-not-allowed opacity-50'
              }`}
              title={t.resetSettingsTitle}
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
            className="flex items-center gap-1 rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90 transition cursor-pointer shadow-xs"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{t.doneBtn}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
