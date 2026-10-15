import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getAppVersion } from '@/core/appinfo'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import { cn } from '@/lib/cn'

export function UpdateMenu() {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState('…')
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const t = uiText(lang)

  useEffect(() => {
    void getAppVersion().then(setVersion)
  }, [])

  return (
    <div className="relative">
      <button
        className={cn(
          'rounded-md p-1.5 text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer',
          open && 'bg-surface-2 text-ink',
        )}
        onClick={() => setOpen((o) => !o)}
        title={t.checkUpdates}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-64 rounded-lg border border-border bg-surface p-3 text-sm shadow-lg">
            <div className="mb-1 font-medium text-ink">{t.updatesTitle}</div>
            <p className="text-ink-soft">{t.noUpdates(version)}</p>
            <p className="mt-2 text-[11px] text-ink-faint">{t.simulatedCheck}</p>
          </div>
        </>
      )}
    </div>
  )
}
