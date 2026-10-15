import type { JSONContent, SceneDoc, JSONMark } from './json'
import { textOf } from './stats'

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/

function inlineToJson(text: string): JSONContent[] {
  const parts = text.split(INLINE).filter((p) => p !== '')
  return parts.map((part) => {
    const marks: JSONMark[] = []
    let value = part
    if (value.startsWith('**') && value.endsWith('**')) {
      value = value.slice(2, -2)
      marks.push({ type: 'strong' })
    } else if ((value.startsWith('*') && value.endsWith('*')) || (value.startsWith('_') && value.endsWith('_'))) {
      value = value.slice(1, -1)
      marks.push({ type: 'em' })
    }
    return marks.length ? { type: 'text', text: value, marks } : { type: 'text', text: value }
  })
}

// ---------------------------------------------------------------------------
// Export (screenplay scene -> Fountain text)
// ---------------------------------------------------------------------------

export function serializeScene(doc: JSONContent): string {
  const lines: string[] = []
  for (const node of doc.content ?? []) {
    const text = textOf(node)
    switch (node.type) {
      case 'scene_heading':
      case 'character':
      case 'shot':
        lines.push('', text.toUpperCase())
        break
      case 'transition':
        lines.push('', text.toUpperCase().endsWith(':') ? text.toUpperCase() : `${text.toUpperCase()}:`)
        break
      case 'parenthetical':
        lines.push(text.startsWith('(') ? text : `(${text})`)
        break
      case 'dialogue':
        lines.push(text)
        break
      case 'action':
      default:
        lines.push('', text)
    }
  }
  return lines.join('\n').replace(/^\n+/, '') + '\n'
}

export function serializeProject(scenes: { title: string; doc: JSONContent }[]): string {
  return scenes.map((s) => serializeScene(s.doc)).join('\n')
}

// ---------------------------------------------------------------------------
// Import (Fountain text -> screenplay doc)
// ---------------------------------------------------------------------------

const SCENE_RE = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[. ]/i
const TRANSITION_RE = /^(FADE (IN|OUT)|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|TO:|FADE TO BLACK)/i

function isCue(line: string, next: string | undefined): boolean {
  if (line.length > 40 || !/[A-Z]/.test(line)) return false
  if (line !== line.toUpperCase()) return false
  return next !== undefined && next.trim() !== ''
}

/** Elements that keep consecutive lines inside one block (a soft break, not a new element). */
const CONTINUABLE = new Set(['action', 'dialogue'])

export function parseFountain(text: string): JSONContent[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const nodes: JSONContent[] = []
  let prev: string | null = null
  let current: JSONContent | null = null

  const flush = () => {
    if (current) nodes.push(current)
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/\s+$/, '')
    const t = line.trim()
    if (t === '') {
      flush()
      prev = null
      continue
    }

    let type: string
    if (SCENE_RE.test(t)) type = 'scene_heading'
    else if (TRANSITION_RE.test(t)) type = 'transition'
    else if (t.startsWith('(') && t.endsWith(')')) type = 'parenthetical'
    else if (prev === 'character' || prev === 'parenthetical' || prev === 'dialogue') {
      type = 'dialogue'
    } else if (isCue(t, lines[i + 1])) type = 'character'
    else type = 'action'

    if (current && current.type === type && CONTINUABLE.has(type)) {
      current.content!.push({ type: 'hard_break' }, ...inlineToJson(t))
    } else {
      flush()
      current = { type, content: inlineToJson(t) }
    }
    prev = type
  }

  flush()
  return nodes.length ? nodes : [{ type: 'action' }]
}

export function parseFountainDoc(text: string): SceneDoc {
  return { type: 'doc', content: parseFountain(text) }
}

/** Splits parsed Fountain nodes into separate scenes at each `scene_heading`. */
export function parseFountainScenes(text: string): SceneDoc[] {
  const nodes = parseFountain(text)
  const scenes: SceneDoc[] = []
  let current: JSONContent[] = []
  for (const n of nodes) {
    if (n.type === 'scene_heading' && current.length > 0) {
      scenes.push({ type: 'doc', content: current })
      current = []
    }
    current.push(n)
  }
  if (current.length > 0) scenes.push({ type: 'doc', content: current })
  return scenes.length > 0 ? scenes : [{ type: 'doc', content: [{ type: 'action' }] }]
}
