import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { APP_AUTHOR, APP_LICENSE, APP_NAME, getAppVersion } from '@/core/appinfo'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import logo from '@/assets/logo.svg'

export function AboutModal({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('…')
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const t = uiText(lang)

  useEffect(() => {
    void getAppVersion().then(setVersion)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt={APP_NAME} className="h-12 w-12 drop-shadow-sm" />
            <div>
              <div className="font-brand text-lg font-bold tracking-tight text-ink">
                Open<span className="text-amber-500">Folio</span>
              </div>
              <div className="text-xs text-ink-faint">{t.versionLabel(version)}</div>
            </div>
          </div>
          <button className="rounded-md p-1 text-ink-soft hover:bg-surface-2" onClick={onClose} title={t.closeBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-faint">{t.authorLabel}</dt>
            <dd className="text-ink">{APP_AUTHOR}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-faint">{t.licenseLabel}</dt>
            <dd className="text-ink">{APP_LICENSE}</dd>
          </div>
        </dl>

        <button
          className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-soft opacity-60"
          disabled
          title={t.comingSoon}
        >
          <ExternalLink className="h-4 w-4" /> {t.githubRepo}
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-faint">{t.linkInactive}</p>
      </div>
    </div>
  )
}
