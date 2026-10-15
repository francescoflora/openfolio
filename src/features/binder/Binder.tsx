import { useState } from 'react'
import type { DragEvent } from 'react'
import { ChevronRight, FileText, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react'
import type { BinderNode } from '@/core/types'
import type { DropPosition } from '@/core/tree'
import { findParent } from '@/core/tree'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import { SearchBox } from '@/features/search/SearchBox'
import { cn } from '@/lib/cn'

function RowIcon({ node, open }: { node: BinderNode; open: boolean }) {
  if (node.kind === 'folder') {
    const Icon = open ? FolderOpen : Folder
    return <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
  }
  return <FileText className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
}

interface DragProps {
  dragId: string | null
  onDragId: (id: string | null) => void
  over: { id: string; pos: DropPosition } | null
  onOver: (o: { id: string; pos: DropPosition } | null) => void
}

function NodeRow({ node, depth, dragId, onDragId, over, onOver }: { node: BinderNode; depth: number } & DragProps) {
  const selected = useProject((s) => s.selectedId === node.id)
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const select = useProject((s) => s.select)
  const addScene = useProject((s) => s.addScene)
  const addFolder = useProject((s) => s.addFolder)
  const rename = useProject((s) => s.rename)
  const remove = useProject((s) => s.remove)
  const moveNode = useProject((s) => s.moveNode)
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const t = uiText(lang)

  const words = node.kind === 'scene' ? node.metadata.wordCount ?? 0 : 0
  // folders may hold chapters (depth 0) or scenes (depth 1)
  const canAddFolder = node.kind === 'folder' && depth === 0
  const active = !!over && over.id === node.id && dragId !== node.id

  const commit = (value: string) => {
    const title = value.trim()
    if (title) rename(node.id, title)
    setEditing(false)
  }

  const dropPos = (e: DragEvent<HTMLDivElement>): DropPosition => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    if (node.kind === 'folder') {
      // thin edge bands reorder; the rest of the row means "drop inside"
      if (y < 6) return 'before'
      if (y > rect.height - 6) return 'after'
      return 'inside'
    }
    return y < rect.height / 2 ? 'before' : 'after'
  }

  return (
    <div>
      <div
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', node.id)
          onDragId(node.id)
        }}
        onDragEnd={() => {
          onDragId(null)
          onOver(null)
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === node.id) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const pos = dropPos(e)
          if (!active || over?.pos !== pos) onOver({ id: node.id, pos })
        }}
        onDragLeave={() => {
          if (over?.id === node.id && over.pos) onOver(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (dragId && dragId !== node.id) {
            const pos = dropPos(e)
            moveNode(dragId, node.id, pos)
            if (pos === 'inside') setOpen(true)
          }
          onDragId(null)
          onOver(null)
        }}
        className={cn(
          'group relative flex items-center gap-1.5 rounded-md pr-1 text-sm cursor-pointer',
          selected ? 'bg-accent/12 text-ink' : 'text-ink-soft hover:bg-surface-2',
          active && over?.pos === 'inside' && 'bg-accent/15 ring-1 ring-accent',
        )}
        style={{ paddingLeft: depth * 12 + 6, paddingTop: 4, paddingBottom: 4 }}
      >
        {active && over?.pos === 'before' && (
          <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-accent" />
        )}
        {active && over?.pos === 'after' && (
          <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-accent" />
        )}

        <button
          className="flex h-4 w-4 items-center justify-center cursor-pointer"
          onClick={() => node.kind === 'folder' && setOpen((o) => !o)}
        >
          {node.kind === 'folder' && (
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
          )}
        </button>

        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left cursor-pointer"
          onClick={() => (node.kind === 'scene' ? select(node.id) : setOpen((o) => !o))}
          onDoubleClick={() => setEditing(true)}
        >
          <RowIcon node={node} open={open} />
          {editing ? (
            <input
              autoFocus
              defaultValue={node.title}
              className="min-w-0 flex-1 rounded border border-accent bg-surface px-1 text-sm outline-none"
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
                if (e.key === 'Escape') setEditing(false)
              }}
            />
          ) : (
            <span className="truncate">{node.title}</span>
          )}
        </button>

        {node.kind === 'scene' && words > 0 && (
          <span className="shrink-0 text-[10px] tabular-nums text-ink-faint group-hover:hidden">{words}</span>
        )}

        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          {canAddFolder && (
            <button title={t.addChapterTitle} className="rounded p-0.5 hover:bg-surface cursor-pointer" onClick={() => addFolder(node.id)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {node.kind === 'folder' && (
            <button title={t.addSceneTitle} className="rounded p-0.5 hover:bg-surface cursor-pointer" onClick={() => addScene(node.id)}>
              <FileText className="h-3.5 w-3.5" />
            </button>
          )}
          <button title={t.deleteTitle} className="rounded p-0.5 hover:bg-surface cursor-pointer" onClick={() => remove(node.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {node.kind === 'folder' && open && node.children && (
        <div>
          {node.children.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              dragId={dragId}
              onDragId={onDragId}
              over={over}
              onOver={onOver}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Binder() {
  const binder = useProject((s) => s.project?.binder)
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const addFolder = useProject((s) => s.addFolder)
  const addScene = useProject((s) => s.addScene)
  const selectedId = useProject((s) => s.selectedId)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; pos: DropPosition } | null>(null)
  const t = uiText(lang)
  const nodes = binder ?? []

  const selectedParentId = (() => {
    if (!binder || !selectedId) return null
    const parent = findParent(binder, selectedId)
    return parent ? parent.id : null
  })()

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Binder</span>
        <div className="flex items-center gap-1">
          <button
            title={t.addSectionTitle}
            className="rounded p-1 text-ink-soft hover:bg-surface-2 cursor-pointer"
            onClick={() => addFolder(null)}
          >
            <Folder className="h-4 w-4" />
          </button>
          <button
            title={t.addSceneTitle}
            className="rounded p-1 text-ink-soft hover:bg-surface-2 cursor-pointer"
            onClick={() => addScene(selectedParentId)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border-b border-border p-1.5">
        <SearchBox />
      </div>
      <div className="flex-1 overflow-auto p-1.5" onDragEnd={() => setOver(null)}>
        {nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            depth={0}
            dragId={dragId}
            onDragId={setDragId}
            over={over}
            onOver={setOver}
          />
        ))}
      </div>
    </aside>
  )
}
