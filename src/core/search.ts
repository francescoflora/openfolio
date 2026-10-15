import type { BinderNode, Project } from './types'
import type { SceneDoc } from './json'
import { collectText } from './stats'

export interface SearchHit {
  sceneId: string
  sceneTitle: string
  snippet: string
}

export function searchProject(
  project: Project,
  scenes: Record<string, SceneDoc>,
  query: string,
  limit = 30,
): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const hits: SearchHit[] = []

  const walk = (nodes: BinderNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'folder') {
        if (n.children) walk(n.children)
        continue
      }
      const doc = scenes[n.id]
      const titleHit = n.title.toLowerCase().includes(q)
      if (doc) {
        const text = collectText(doc)
        const idx = text.toLowerCase().indexOf(q)
        if (idx >= 0 || titleHit) {
          const from = Math.max(0, idx - 30)
          const snippet = idx >= 0 ? `…${text.slice(from, from + 90).trim()}…` : (n.metadata.synopsis ?? '')
          hits.push({ sceneId: n.id, sceneTitle: n.title, snippet })
        }
      } else if (titleHit) {
        hits.push({ sceneId: n.id, sceneTitle: n.title, snippet: '' })
      }
      if (hits.length >= limit) return
    }
  }
  walk(project.binder)
  return hits.slice(0, limit)
}
