import type { JSONContent } from './json'

export function textOf(node: JSONContent, hardBreak = '\n'): string {
  return (node.content ?? []).map((c) => (c.type === 'hard_break' ? hardBreak : c.text ?? '')).join('')
}

export function collectText(doc: JSONContent): string {
  if (doc.text !== undefined) return doc.text
  if (doc.type === 'hard_break') return ' '

  const content = doc.content ?? []
  // Formatting and revisions split inline text into runs without adding spaces.
  // Only block boundaries and hard breaks separate words.
  const separator = content.some((node) => node.type !== 'text' && node.type !== 'hard_break') ? ' ' : ''
  return content.map(collectText).filter(Boolean).join(separator)
}

export function countWords(doc: JSONContent): number {
  const text = collectText(doc).trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Counts characters (battute, spazi inclusi) across a document.
 */
export function countChars(doc: JSONContent): number {
  if (!doc) return 0
  let count = 0
  const walk = (node: JSONContent) => {
    if (node.text) {
      count += node.text.length
    } else if (node.type === 'hard_break') {
      count += 1
    }
    node.content?.forEach(walk)
  }
  walk(doc)
  return count
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'documento'
}

export function hasCustomTitle(title: string): boolean {
  const clean = title.trim().toLowerCase()
  return clean !== '' && clean !== 'senza titolo' && clean !== 'untitled'
}
