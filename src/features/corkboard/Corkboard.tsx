import type { BinderNode } from '@/core/types'
import { statusLabels, uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import { cn } from '@/lib/cn'

function Card({ node }: { node: BinderNode }) {
  const selected = useProject((s) => s.selectedId === node.id)
  const language = useProject((s) => s.project?.settings.language ?? s.language)
  const select = useProject((s) => s.select)
  const setView = useProject((s) => s.setView)
  const meta = node.metadata
  const statusLabel = statusLabels(language)
  const t = uiText(language)

  return (
    <button
      className={cn(
        'flex h-40 w-56 flex-col gap-2 rounded-lg border bg-surface p-3 text-left shadow-sm transition',
        selected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-ink-faint',
      )}
      onClick={() => select(node.id)}
      onDoubleClick={() => {
        select(node.id)
        setView('editor')
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-semibold">{node.title}</span>
        <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-faint">
          {statusLabel[meta.status ?? 'draft']}
        </span>
      </div>
      <p className="line-clamp-4 flex-1 text-xs text-ink-soft">{meta.synopsis || '—'}</p>
      <span className="text-[10px] text-ink-faint">{meta.wordCount ?? 0} {t.wordsUnit}</span>
    </button>
  )
}

function NodeGroup({ nodes }: { nodes: BinderNode[] }) {
  const folders = nodes.filter((n) => n.kind === 'folder')
  const scenes = nodes.filter((n) => n.kind === 'scene')
  return (
    <div className="flex flex-col gap-4">
      {scenes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {scenes.map((n) => (
            <Card key={n.id} node={n} />
          ))}
        </div>
      )}
      {folders.map((n) => (
        <div key={n.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{n.title}</h3>
          <NodeGroup nodes={n.children ?? []} />
        </div>
      ))}
    </div>
  )
}

export function Corkboard() {
  const binder = useProject((s) => s.project?.binder ?? [])
  return (
    <div className="flex-1 overflow-auto bg-canvas p-6">
      <NodeGroup nodes={binder} />
    </div>
  )
}
