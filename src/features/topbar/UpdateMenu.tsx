import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from 'lucide-react'
import { getAppVersion } from '@/core/appinfo'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import { canAutoUpdate, useUpdater } from '@/store/useUpdater'
import { cn } from '@/lib/cn'

export function UpdateMenu() {
  const [open, setOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [version, setVersion] = useState('…')
  const lang = useProject((s) => s.language)
  const t = uiText(lang)
  const { status, version: newVersion, progress, error, check, install } = useUpdater()

  useEffect(() => {
    void getAppVersion().then(setVersion)
  }, [])

  const supported = canAutoUpdate()
  const hasUpdate = status === 'available'
  const busy = status === 'checking' || status === 'downloading'

  const handleSaveAndProceed = async () => {
    setSaving(true)
    const hasProject = useProject.getState().project !== null
    if (hasProject) {
      try {
        await useProject.getState().save()
      } catch (err) {
        console.warn('Auto-save before update failed', err)
      }
    }
    setSaving(false)
    setShowConfirm(false)
    setOpen(true)
    void install()
  }

  const handleProceedWithoutSaving = () => {
    setShowConfirm(false)
    setOpen(true)
    void install()
  }

  const body = () => {
    if (status === 'error') {
      return (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{t.updateErrorTitle}</span>
          </div>
          {error && (
            <p className="truncate text-[10px] text-ink-faint bg-surface-2 p-1.5 rounded border border-border/50" title={error}>
              {error}
            </p>
          )}
          {supported && (
            <button
              className="flex items-center justify-center gap-1.5 self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              onClick={() => void check()}
            >
              <RefreshCw className="h-3.5 w-3.5" /> {t.updateRetry}
            </button>
          )}
        </div>
      )
    }

    if (status === 'downloading') {
      return (
        <div className="flex flex-col gap-2.5 py-1">
          <div className="flex items-center justify-between text-xs font-medium text-ink">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              {t.updateDownloading}
            </span>
            {progress !== null && (
              <span className="font-mono font-semibold text-accent">{progress}%</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-border/50">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            {t.updateDownloadingHint}
          </p>
        </div>
      )
    }

    if (status === 'ready') {
      return (
        <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{t.updateReady}</span>
        </div>
      )
    }

    if (hasUpdate && newVersion) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-accent/10 border border-accent/25 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent shrink-0" />
              <span className="text-xs font-semibold text-ink">
                {t.updateAvailable(newVersion)}
              </span>
            </div>
            <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-ink uppercase tracking-wider">
              NEW
            </span>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink hover:opacity-90 shadow-2xs transition-all cursor-pointer"
            onClick={() => setShowConfirm(true)}
          >
            <Download className="h-4 w-4" /> {t.updateDownloadBtn}
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">

        {status === 'none' && (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{t.updateUpToDate}</span>
          </div>
        )}

        {supported ? (
          <button
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer disabled:opacity-60"
            disabled={busy}
            onClick={() => void check()}
          >
            {status === 'checking' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span>{t.updateChecking}</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t.checkUpdates}</span>
              </>
            )}
          </button>
        ) : (
          <p className="text-[11px] text-ink-faint leading-relaxed">
            {t.updateUnsupported}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        <button
          id="update-menu-button"
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
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface animate-pulse" />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-9 z-20 w-80 rounded-xl border border-border bg-surface p-3.5 text-sm shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className={cn('h-3.5 w-3.5 text-ink-soft', status === 'checking' && 'animate-spin text-accent')} />
                  <span className="font-semibold text-ink text-xs uppercase tracking-wider">{t.updatesTitle}</span>
                </div>
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-mono font-medium text-ink-faint">
                  v{version}
                </span>
              </div>
              {body()}
            </div>
          </>
        )}
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-ink">{t.updateConfirmTitle}</h3>
                  <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                    {t.updateConfirmMsg}
                  </p>
                </div>
              </div>
              <button
                className="rounded-md p-1 text-ink-faint hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                onClick={() => setShowConfirm(false)}
                title={t.updateConfirmCancel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink hover:opacity-90 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                disabled={saving}
                onClick={() => void handleSaveAndProceed()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t.updateConfirmSaveAndProceed}
              </button>

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                disabled={saving}
                onClick={handleProceedWithoutSaving}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                {t.updateConfirmProceedWithoutSaving}
              </button>

              <button
                className="flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-ink transition-colors cursor-pointer"
                disabled={saving}
                onClick={() => setShowConfirm(false)}
              >
                {t.updateConfirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
