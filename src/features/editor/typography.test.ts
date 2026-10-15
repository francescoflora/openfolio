import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import { screenplaySchema } from '@/core/schema/screenplay'
import { typographyPlugin } from './typography'

/** Types `char` right after `docText` via handleTextInput and returns the resulting block text. */
function typeAfter(docText: string, char: string): string {
  const doc = screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [{ type: 'action', content: docText ? [{ type: 'text', text: docText }] : [] }],
  })
  const pos = 1 + docText.length
  let next = EditorState.create({
    doc,
    selection: TextSelection.create(doc, pos),
  })
  const view = {
    get state() { return next },
    composing: false,
    dispatch: (tr: Transaction) => { next = next.apply(tr) },
  } as unknown as EditorView
  const plugin = typographyPlugin()
  const insert = () => next.tr.insertText(char, pos, pos)
  const handled = plugin.props.handleTextInput?.call(plugin, view, pos, pos, char, insert)
  if (!handled) next = next.apply(insert())
  return next.doc.textContent
}

/** Simulates pressing a key via handleKeyDown right after `docText`. */
function keyDownAfter(docText: string, key: string): string {
  const doc = screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [{ type: 'action', content: docText ? [{ type: 'text', text: docText }] : [] }],
  })
  const pos = 1 + docText.length
  let next = EditorState.create({
    doc,
    selection: TextSelection.create(doc, pos),
  })
  const view = {
    get state() { return next },
    composing: false,
    dispatch: (tr: Transaction) => { next = next.apply(tr) },
  } as unknown as EditorView
  const plugin = typographyPlugin()
  let prevented = false
  const event = {
    key,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => { prevented = true },
  } as unknown as KeyboardEvent

  const handled = plugin.props.handleKeyDown?.call(plugin, view, event)
  if (!handled || !prevented) {
    next = next.apply(next.tr.insertText(key, pos, pos))
  }
  return next.doc.textContent
}

describe('typographyPlugin', () => {
  it('turns a single < into « and a single > into » via textInput', () => {
    expect(typeAfter('', '<')).toBe('«')
    expect(typeAfter('', '>')).toBe('»')
    expect(typeAfter('Dice ', '<')).toBe('Dice «')
    expect(typeAfter('Dice «ciao', '>')).toBe('Dice «ciao»')
  })

  it('turns a single < into « and a single > into » via keydown directly', () => {
    expect(keyDownAfter('', '<')).toBe('«')
    expect(keyDownAfter('', '>')).toBe('»')
    expect(keyDownAfter('Dice ', '<')).toBe('Dice «')
    expect(keyDownAfter('Dice «ciao', '>')).toBe('Dice «ciao»')
  })

  it('gracefully handles double typing << and >> without creating double caporali', () => {
    // If text already has « and user types second <
    expect(typeAfter('«', '<')).toBe('«')
    expect(keyDownAfter('«', '<')).toBe('«')

    // If text already has » and user types second >
    expect(typeAfter('»', '>')).toBe('»')
    expect(keyDownAfter('»', '>')).toBe('»')

    // If text had < and user types <
    expect(typeAfter('<', '<')).toBe('«')
    expect(keyDownAfter('<', '<')).toBe('«')

    // If text had > and user types >
    expect(typeAfter('>', '>')).toBe('»')
    expect(keyDownAfter('>', '>')).toBe('»')
  })
})
