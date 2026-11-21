import { describe, expect, it } from 'vitest'
import { proseSchema } from '@/core/schema/prose'
import { screenplaySchema } from '@/core/schema/screenplay'
import { collectMisspellings } from './spellcheck'

const checker = {
  correct: (word: string) => ['hello', 'world', 'ciao', 'bruno'].includes(word.toLowerCase()),
}

describe('spellcheck', () => {
  it('flags misspelled words with document positions', () => {
    const doc = proseSchema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Helo world' }] }],
    })
    const hits = collectMisspellings(doc, checker)
    expect(hits).toHaveLength(1)
    expect(doc.textBetween(hits[0]!.from, hits[0]!.to)).toBe('Helo')
  })

  it('skips character names in screenplays', () => {
    const doc = screenplaySchema.nodeFromJSON({
      type: 'doc',
      content: [
        { type: 'character', content: [{ type: 'text', text: 'Zyx' }] },
        { type: 'action', content: [{ type: 'text', text: 'Helo' }] },
      ],
    })
    const hits = collectMisspellings(doc, checker)
    expect(hits).toHaveLength(1)
    expect(doc.textBetween(hits[0]!.from, hits[0]!.to)).toBe('Helo')
  })
})
