import { useEffect, useState } from 'react'
import { Check, Download, Loader2, RefreshCw } from 'lucide-react'
import { getAppVersion } from '@/core/appinfo'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import { canAutoUpdate, useUpdater } from '@/store/useUpdater'
import { cn } from '@/lib/cn'

export function UpdateMenu() {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState('…')
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const t = uiText(lang)
  const { status, version: newVersion, notes, progress, error, check, install } = useUpdater()

  useEffect(() => {
    void getAppVersion().then(setVersion)
  }, [])

  const supported = canAutoUpdate()
  const hasUpdate = status === 'available'
  const busy = status === 'checking' || status === 'downloading'

  const body = () => {
    if (status === 'error') {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-ink-soft">{t.updateErrorTitle}</p>
          {supported && (
            <button
              className="self-start rounded-md border border-border px-2.5 py-1 text-xs text-ink-soft hover:bg-surface-2 cursor-pointer"
              onClick={() => void check()}
            >
              {t.updateRetry}
            </button>
          )}
          {error && <p className="truncate text-[10px] text-ink-faint" title={error}>{error}</p>}
        </div>
      )
    }

    if (status === 'downloading') {
      return (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.updateDownloading}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </div>
      )
    }

    if (status === 'ready') {
      return (
        <p className="flex items-center gap-2 text-ink-soft">
          <Check className="h-3.5 w-3.5 text-green-600" /> {t.updateReady}
        </p>
      )
    }

    if (hasUpdate && newVersion) {
      return (
        <div className="flex flex-col gap-2">
          <p className="font-medium text-ink">{t.updateAvailable(newVersion)}</p>
          {notes && <p className="max-h-28 overflow-auto whitespace-pre-line text-xs text-ink-soft">{notes}</p>}
          <button
            className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:opacity-90 cursor-pointer"
            onClick={() => void install()}
          >
            <Download className="h-3.5 w-3.5" /> {t.updateDownloadBtn}
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <p className="text-ink-soft">{t.updateCurrent(version)}</p>
        {supported ? (
          <button
            className="flex items-center gap-1.5 self-start rounded-md border border-border px-2.5 py-1 text-xs text-ink-soft hover:bg-surface-2 cursor-pointer disabled:opacity-50"
            disabled={busy}
            onClick={() => void check()}
          >
            {status === 'checking' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {status === 'checking' ? t.updateChecking : t.checkUpdates}
          </button>
        ) : (
          <p className="text-[10px] text-ink-faint">{t.updateUnsupported}</p>
        )}
        {status === 'none' && <p className="text-[11px] text-ink-faint">{t.updateUpToDate}</p>}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        className={cn(
          'relative rounded-md p-1.5 text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer',
          (open || hasUpdate) && 'text-ink',
          open && 'bg-surface-2',
        )}
        onClick={() => setOpen((o) => !o)}
        title={t.checkUpdates}
      >
        <RefreshCw className="h-4 w-4" />
        {hasUpdate && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-72 rounded-lg border border-border bg-surface p-3 text-sm shadow-lg">
            <div className="mb-1 font-medium text-ink">{t.updatesTitle}</div>
            {body()}
          </div>
        </>
      )}
    </div>
  )
}
