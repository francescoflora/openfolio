import { useProject } from '@/store/useProject'
import { flatten } from '@/core/tree'
import { statusLabels, uiText } from '@/core/i18n'
import { cn } from '@/lib/cn'

export function Outline() {
  const binder = useProject((s) => s.project?.binder)
  const selectedId = useProject((s) => s.selectedId)
  const language = useProject((s) => s.project?.settings.language ?? s.language)
  const select = useProject((s) => s.select)
  const setView = useProject((s) => s.setView)
  const statusLabel = statusLabels(language)
  const t = uiText(language)
  const rows = flatten(binder ?? [])

  return (
    <div className="flex-1 overflow-auto bg-canvas p-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
            <th className="px-3 py-2 font-semibold">{t.outlineItemCol}</th>
            <th className="w-24 px-3 py-2 font-semibold">{t.outlineStatusCol}</th>
            <th className="w-20 px-3 py-2 text-right font-semibold">{t.outlineWordsCol}</th>
            <th className="px-3 py-2 font-semibold">{t.outlineSynopsisCol}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ node, depth }) => (
            <tr
              key={node.id}
              className={cn(
                'cursor-pointer border-t border-border',
                selectedId === node.id ? 'bg-accent/10' : 'hover:bg-surface-2',
                node.kind === 'folder' && 'font-semibold',
              )}
              onClick={() => select(node.id)}
              onDoubleClick={() => {
                select(node.id)
                if (node.kind === 'scene') setView('editor')
              }}
            >
              <td className="px-3 py-2" style={{ paddingLeft: depth * 16 + 12 }}>
                {node.title}
              </td>
              <td className="px-3 py-2 text-ink-soft">
                {node.kind === 'scene' ? statusLabel[node.metadata.status ?? 'draft'] : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-ink-faint">{node.metadata.wordCount ?? ''}</td>
              <td className="truncate px-3 py-2 text-ink-soft" style={{ maxWidth: 360 }}>
                {node.metadata.synopsis ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
