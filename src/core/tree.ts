import type { BinderNode } from './types'

export function findNode(nodes: BinderNode[], id: string): BinderNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = n.children && findNode(n.children, id)
    if (hit) return hit
  }
  return undefined
}

export function findParent(nodes: BinderNode[], id: string, parent: BinderNode | null = null): BinderNode | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent
    if (n.children) {
      const hit = findParent(n.children, id, n)
      if (hit !== undefined) return hit
    }
  }
  return undefined
}

export function mapTree(nodes: BinderNode[], fn: (n: BinderNode) => BinderNode): BinderNode[] {
  return nodes.map((n) => {
    const next = fn(n)
    return next.children ? { ...next, children: mapTree(next.children, fn) } : next
  })
}

export function removeNode(nodes: BinderNode[], id: string): BinderNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n))
}

export function insertNode(nodes: BinderNode[], parentId: string | null, node: BinderNode): BinderNode[] {
  if (parentId === null) return [...nodes, node]
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...(n.children ?? []), node] }
      : n.children
        ? { ...n, children: insertNode(n.children, parentId, node) }
        : n,
  )
}

export function updateNode(nodes: BinderNode[], id: string, patch: Partial<BinderNode>): BinderNode[] {
  return mapTree(nodes, (n) => (n.id === id ? { ...n, ...patch } : n))
}

export type DropPosition = 'before' | 'after' | 'inside'

function insertSibling(
  nodes: BinderNode[],
  targetId: string,
  node: BinderNode,
  before: boolean,
): BinderNode[] | null {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.id === targetId) {
      const out = nodes.slice()
      out.splice(before ? i : i + 1, 0, node)
      return out
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!
    if (n.children) {
      const res = insertSibling(n.children, targetId, node, before)
      if (res) {
        const out = nodes.slice()
        out[i] = { ...n, children: res }
        return out
      }
    }
  }
  return null
}

/**
 * Move `dragId` relative to `targetId`. Returns the original tree (same
 * reference) when the move is a no-op: same node, unknown id, or an attempt to
 * drop a folder inside one of its own descendants.
 */
export function moveNode(
  nodes: BinderNode[],
  dragId: string,
  targetId: string,
  position: DropPosition,
): BinderNode[] {
  if (dragId === targetId) return nodes
  const node = findNode(nodes, dragId)
  if (!node) return nodes
  if (node.children && findNode(node.children, targetId)) return nodes
  const without = removeNode(nodes, dragId)
  if (position === 'inside') return insertNode(without, targetId, node)
  return insertSibling(without, targetId, node, position === 'before') ?? nodes
}

export interface FlatNode {
  node: BinderNode
  depth: number
}

export function flatten(nodes: BinderNode[], depth = 0): FlatNode[] {
  const out: FlatNode[] = []
  for (const n of nodes) {
    out.push({ node: n, depth })
    if (n.children) out.push(...flatten(n.children, depth + 1))
  }
  return out
}

export function sceneIds(nodes: BinderNode[]): string[] {
  return flatten(nodes)
    .filter(({ node }) => node.kind === 'scene')
    .map(({ node }) => node.id)
}
