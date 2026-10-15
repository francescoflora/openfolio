import { describe, expect, it } from 'vitest'
import { moveNode } from './tree'
import type { BinderNode } from './types'

const scene = (id: string): BinderNode => ({ id, title: id, kind: 'scene', metadata: {} })
const folder = (id: string, children: BinderNode[] = []): BinderNode => ({
  id,
  title: id,
  kind: 'folder',
  children,
  metadata: {},
})

describe('moveNode', () => {
  it('reorders siblings (before)', () => {
    const tree = [scene('a'), scene('b'), scene('c')]
    const next = moveNode(tree, 'c', 'a', 'before')
    expect(next.map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('reorders siblings (after)', () => {
    const tree = [scene('a'), scene('b'), scene('c')]
    const next = moveNode(tree, 'a', 'c', 'after')
    expect(next.map((n) => n.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves a scene inside a folder', () => {
    const tree = [folder('f', [scene('s1')]), scene('s2')]
    const next = moveNode(tree, 's2', 'f', 'inside')
    expect(next.map((n) => n.id)).toEqual(['f'])
    expect(next[0]!.children!.map((n) => n.id)).toEqual(['s1', 's2'])
  })

  it('moves a folder inside another folder', () => {
    const tree = [folder('f1'), folder('f2')]
    const next = moveNode(tree, 'f1', 'f2', 'inside')
    expect(next.map((n) => n.id)).toEqual(['f2'])
    expect(next[0]!.children!.map((n) => n.id)).toEqual(['f1'])
  })

  it('refuses to drop a folder inside its own descendant', () => {
    const tree = [folder('f1', [folder('f2')])]
    expect(moveNode(tree, 'f1', 'f2', 'inside')).toBe(tree)
  })

  it('is a no-op on same id or unknown id', () => {
    const tree = [scene('a')]
    expect(moveNode(tree, 'a', 'a', 'before')).toBe(tree)
    expect(moveNode(tree, 'x', 'a', 'before')).toBe(tree)
  })
})
