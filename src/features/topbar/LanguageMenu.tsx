import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { LANGUAGES, normalizeLanguage, uiText } from '@/core/i18n'
import type { Language } from '@/core/types'
import { cn } from '@/lib/cn'

export function LanguageMenu() {
  const settings = useProject((s) => s.project?.settings)
  const appLanguage = useProject((s) => s.language)
  const dictionaryLanguage = useProject((s) => s.project?.settings.language ?? s.language)
  const setLanguage = useProject((s) => s.setLanguage)
  const updateSettings = useProject((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const t = uiText(appLanguage)

  return (
    <div className="relative">
      <button
        className={cn(
          'flex items-center rounded-md p-1.5 text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer',
          open && 'bg-surface-2 text-ink',
        )}
        onClick={() => setOpen((o) => !o)}
        title={t.langAndSpellcheck}
      >
        <Languages className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg">
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">
              {t.appLanguageLabel}
            </label>
            <select
              className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              value={normalizeLanguage(appLanguage)}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>

            {settings && (
              <div className="mt-3 border-t border-border pt-3">
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">
                  {t.dictionaryLanguageLabel}
                </label>
                <select
                  className="w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                  value={normalizeLanguage(dictionaryLanguage)}
                  onChange={(e) => updateSettings({ language: e.target.value as Language })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>

                <label className="mt-2.5 flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={settings.spellcheck ?? true}
                    onChange={(e) => updateSettings({ spellcheck: e.target.checked })}
                  />
                  {t.spellcheckLabel}
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
