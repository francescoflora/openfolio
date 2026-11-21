import { describe, expect, it } from 'vitest'
import type { SceneDoc } from './json'
import { collectText, countChars, countWords, textOf } from './stats'

describe('document text and statistics', () => {
  it('keeps words intact across formatting and revision marks', () => {
    const doc: SceneDoc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Una ca' },
          { type: 'text', text: 's', marks: [{ type: 'strong' }] },
          { type: 'text', text: 'a', marks: [{ type: 'revision' }] },
        ],
      }],
    }

    expect(collectText(doc)).toBe('Una casa')
    expect(countWords(doc)).toBe(2)
    expect(countChars(doc)).toBe(8)
    expect(textOf(doc.content[0]!)).toBe('Una casa')
  })

  it('separates text blocks, including paragraphs inside blockquotes', () => {
    const doc: SceneDoc = {
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Titolo' }] },
        { type: 'paragraph' },
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Prima frase' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Seconda frase' }] },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Fine' }] },
      ],
    }

    expect(collectText(doc)).toBe('Titolo Prima frase Seconda frase Fine')
    expect(countWords(doc)).toBe(6)
  })

  it('treats hard breaks as word boundaries and preserves authored whitespace', () => {
    const doc: SceneDoc = {
      type: 'doc',
      content: [{
        type: 'action',
        content: [
          { type: 'text', text: 'Prima  frase' },
          { type: 'hard_break' },
          { type: 'text', text: 'Seconda frase' },
        ],
      }],
    }

    expect(collectText(doc)).toBe('Prima  frase Seconda frase')
    expect(countWords(doc)).toBe(4)
    expect(countChars(doc)).toBe(26)
    expect(textOf(doc.content[0]!)).toBe('Prima  frase\nSeconda frase')
  })

  it('returns no words for documents containing only empty blocks', () => {
    const doc: SceneDoc = {
      type: 'doc',
      content: [{ type: 'heading' }, { type: 'paragraph' }],
    }

    expect(collectText(doc)).toBe('')
    expect(countWords(doc)).toBe(0)
    expect(countChars(doc)).toBe(0)
  })
})
