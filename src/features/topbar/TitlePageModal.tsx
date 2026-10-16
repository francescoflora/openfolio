import { BookOpen, X } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { uiText } from '@/core/i18n'

const field =
  'w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:border-accent'
const label = 'mb-1 block text-[11px] uppercase tracking-wide text-ink-faint'

export function TitlePageModal({ onClose }: { onClose: () => void }) {
  const project = useProject((s) => s.project)
  const lang = useProject((s) => s.language)
  const setProjectTitle = useProject((s) => s.setProjectTitle)
  const updateSettings = useProject((s) => s.updateSettings)
  if (!project) return null

  const s = project.settings
  const tp = s.titlePage ?? {}
  const t = uiText(lang)

  const setTitle = (title: string) => {
    setProjectTitle(title)
    updateSettings({ titlePage: { ...tp, title } })
  }
  const setAuthor = (author: string) => {
    updateSettings({ author, titlePage: { ...tp, author } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-accent" /> {t.titlePageBtn}
          </div>
          <button className="rounded-md p-1 text-ink-soft hover:bg-surface-2" onClick={onClose} title={t.closeBtn}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className={label}>{t.titleLabel}</label>
            <input className={field} value={project.title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.authorLabel}</label>
            <input className={field} value={s.author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className={label}>{t.contactLabel}</label>
            <textarea
              className={`${field} h-20 resize-none`}
              value={tp.contact ?? ''}
              onChange={(e) => updateSettings({ titlePage: { ...tp, contact: e.target.value } })}
              placeholder={t.contactPlaceholder}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
