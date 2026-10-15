import { Camera, RotateCcw, Trash2 } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { findNode } from '@/core/tree'
import { SCENE_STATUSES } from '@/core/types'
import type { SceneStatus } from '@/core/types'
import { statusLabels, uiText } from '@/core/i18n'

const field = 'w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:border-accent'

function ProjectPanel() {
  const project = useProject((s) => s.project)
  const setProjectTitle = useProject((s) => s.setProjectTitle)
  const updateSettings = useProject((s) => s.updateSettings)
  if (!project) return null
  const s = project.settings
  const tp = s.titlePage ?? {}
  const t = uiText(s.language)

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-auto border-l border-border bg-surface p-3 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.projectHeader}</div>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">{t.titleLabel}</label>
        <input className={field} value={project.title} onChange={(e) => setProjectTitle(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">{t.authorLabel}</label>
        <input className={field} value={s.author} onChange={(e) => updateSettings({ author: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">{t.titlePageTitleLabel}</label>
        <input className={field} value={tp.title ?? ''} onChange={(e) => updateSettings({ titlePage: { ...tp, title: e.target.value } })} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">{t.titlePageContactLabel}</label>
        <input className={field} value={tp.contact ?? ''} onChange={(e) => updateSettings({ titlePage: { ...tp, contact: e.target.value } })} />
      </div>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">{t.wordGoalLabel}</label>
        <input
          type="number"
          className={field}
          value={s.wordGoal ?? ''}
          onChange={(e) => updateSettings({ wordGoal: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
      {s.template && <div className="text-xs text-ink-faint">Template: {s.template}</div>}
    </aside>
  )
}

export function Inspector() {
  const project = useProject((s) => s.project)
  const selectedId = useProject((s) => s.selectedId)
  const rename = useProject((s) => s.rename)
  const updateMeta = useProject((s) => s.updateMeta)
  const addSnapshot = useProject((s) => s.addSnapshot)
  const restoreSnapshot = useProject((s) => s.restoreSnapshot)
  const deleteSnapshot = useProject((s) => s.deleteSnapshot)

  const node = project && selectedId ? findNode(project.binder, selectedId) : undefined
  if (!node || node.kind !== 'scene') {
    return <ProjectPanel />
  }

  const lang = project?.settings.language
  const statusLabel = statusLabels(lang)
  const t = uiText(lang)
  const meta = node.metadata
  const snaps = project?.snapshots[node.id] ?? []

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-auto border-l border-border bg-surface p-3 text-sm">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.titleLabel}</label>
        <input className={field} value={node.title} onChange={(e) => rename(node.id, e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.outlineStatusCol}</label>
          <select
            className={field}
            value={meta.status ?? 'draft'}
            onChange={(e) => updateMeta(node.id, { status: e.target.value as SceneStatus })}
          >
            {SCENE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.labelField}</label>
          <input className={field} value={meta.label ?? ''} onChange={(e) => updateMeta(node.id, { label: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.synopsisLabel}</label>
        <textarea
          className={`${field} h-20 resize-none`}
          value={meta.synopsis ?? ''}
          onChange={(e) => updateMeta(node.id, { synopsis: e.target.value })}
          placeholder={t.synopsisPlaceholder}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t.notesLabel}</label>
        <textarea
          className={`${field} h-20 resize-none`}
          value={meta.note ?? ''}
          onChange={(e) => updateMeta(node.id, { note: e.target.value })}
          placeholder={t.notesPlaceholder}
        />
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Snapshot ({snaps.length})</span>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-soft hover:bg-surface-2"
          onClick={() => addSnapshot(node.id)}
        >
          <Camera className="h-3.5 w-3.5" /> {t.createBtn}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {snaps.map((s) => (
          <li key={s.id} className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs">
            <span className="flex-1 truncate text-ink-soft">{s.label}</span>
            <span className="text-ink-faint">{s.words}p</span>
            <button title={t.restoreTitle} className="rounded p-0.5 hover:bg-surface" onClick={() => restoreSnapshot(node.id, s.id)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button title={t.deleteTitle} className="rounded p-0.5 hover:bg-surface" onClick={() => deleteSnapshot(node.id, s.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {!snaps.length && <li className="text-xs text-ink-faint">{t.noSnapshots}</li>}
      </ul>
    </aside>
  )
}
