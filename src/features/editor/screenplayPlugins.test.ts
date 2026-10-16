import { describe, expect, it } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import type { Transaction } from 'prosemirror-state'
import type { JSONContent } from '@/core/json'
import { screenplaySchema } from '@/core/schema/screenplay'
import { enterKeymap, hardBreakKeymap, parentheticalKeymap, parentheticalPlugin, placeholderPlugin, tabKeymap } from './screenplayPlugins'
import type { EditorView } from 'prosemirror-view'

function stateOf(content: JSONContent[]): EditorState {
  return EditorState.create({ doc: screenplaySchema.nodeFromJSON({ type: 'doc', content }) })
}

function blocks(...nodes: [string, string][]): JSONContent[] {
  return nodes.map(([type, text]) => (text ? { type, content: [{ type: 'text', text }] } : { type }))
}

function at(state: EditorState, pos: number): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
}

function run(state: EditorState, key: 'Enter' | 'Shift-Enter'): EditorState {
  const binding = key === 'Enter' ? enterKeymap(screenplaySchema).Enter : hardBreakKeymap(screenplaySchema)['Shift-Enter']
  let current = state
  binding(state, (tr: Transaction) => {
    current = current.apply(tr)
  })
  return current
}

describe('enterKeymap', () => {
  it('creates a new empty block from an empty block', () => {
    const next = run(at(stateOf(blocks(['action', ''], ['action', 'test'])), 1), 'Enter')
    expect(next.doc.childCount).toBe(3)
    expect(next.doc.child(0).type.name).toBe('action')
    expect(next.doc.child(0).textContent).toBe('')
    expect(next.doc.child(1).type.name).toBe('action')
    expect(next.doc.child(2).textContent).toBe('test')
  })

  it('creates a new block from a trailing empty block', () => {
    const next = run(at(stateOf(blocks(['action', 'test'], ['action', ''])), 7), 'Enter')
    expect(next.doc.childCount).toBe(3)
    expect(next.doc.child(2).type.name).toBe('action')
  })

  it('splits a non-empty block', () => {
    const next = run(at(stateOf(blocks(['action', 'hello'])), 6), 'Enter')
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).textContent).toBe('hello')
    expect(next.doc.child(1).textContent).toBe('')
  })

  it('does not treat a block holding only a soft break as empty', () => {
    const state = stateOf([{ type: 'action', content: [{ type: 'hard_break' }] }])
    const next = run(at(state, 1), 'Enter')
    expect(next.doc.childCount).toBe(2)
  })

  it('converts an empty character block to action on Enter (double-enter escape)', () => {
    const next = run(at(stateOf(blocks(['character', ''])), 1), 'Enter')
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.child(0).type.name).toBe('action')
  })

  it('converts an empty parenthetical block to action on Enter', () => {
    const next = run(at(stateOf(blocks(['parenthetical', ''])), 1), 'Enter')
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.child(0).type.name).toBe('action')
  })

  it('converts an empty dialogue block to action on Enter', () => {
    const next = run(at(stateOf(blocks(['dialogue', ''])), 1), 'Enter')
    expect(next.doc.childCount).toBe(1)
    expect(next.doc.child(0).type.name).toBe('action')
  })

  it('splits non-empty character to dialogue on Enter', () => {
    const next = run(at(stateOf(blocks(['character', 'MARCO'])), 6), 'Enter')
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('character')
    expect(next.doc.child(1).type.name).toBe('dialogue')
  })

  it('moves to next line on Enter from parenthetical without pushing closing parenthesis down', () => {
    // Cursor right before ')'
    const state = at(stateOf(blocks(['parenthetical', '(sussurrando)'])), 13)
    const next = run(state, 'Enter')
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('(sussurrando)')
    expect(next.doc.child(1).type.name).toBe('dialogue')
    expect(next.doc.child(1).textContent).toBe('')
    expect(next.selection.$from.parent.type.name).toBe('dialogue')
    expect(next.selection.$from.parentOffset).toBe(0)
  })

  it('moves to next line on Enter from anywhere inside parenthetical without pushing parenthesis down', () => {
    // Cursor in middle: offset 5
    const state = at(stateOf(blocks(['parenthetical', '(sussurrando)'])), 5)
    const next = run(state, 'Enter')
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('(sussurrando)')
    expect(next.doc.child(1).type.name).toBe('dialogue')
    expect(next.doc.child(1).textContent).toBe('')
  })
})

describe('tabKeymap', () => {
  function runTab(state: EditorState, key: 'Tab' | 'Shift-Tab'): EditorState {
    const binding = key === 'Tab' ? tabKeymap(screenplaySchema).Tab : tabKeymap(screenplaySchema)['Shift-Tab']
    let current = state
    binding(state, (tr: Transaction) => {
      current = current.apply(tr)
    })
    return current
  }

  it('rotates action to shot on Tab', () => {
    const next = runTab(at(stateOf(blocks(['action', 'test'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('shot')
  })

  it('rotates shot to character on Tab', () => {
    const next = runTab(at(stateOf(blocks(['shot', 'test'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('character')
  })

  it('rotates character to parenthetical on Tab', () => {
    const next = runTab(at(stateOf(blocks(['character', 'MARCO'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('parenthetical')
  })

  it('toggles dialogue to parenthetical when directly following character', () => {
    const state = at(stateOf(blocks(['character', 'MARCO'], ['dialogue', ''])), 8)
    const next = runTab(state, 'Tab')
    expect(next.doc.child(1).type.name).toBe('parenthetical')
  })

  it('rotates character to parenthetical (perifrasi) on Tab when directly following dialogue, keeping it empty for anteprima', () => {
    const state = at(stateOf(blocks(['dialogue', 'Ciao.'], ['character', ''])), 8)
    const next = runTab(state, 'Tab')
    expect(next.doc.child(1).type.name).toBe('parenthetical')
    expect(next.doc.child(1).textContent).toBe('')
  })

  it('rotates action to shot on Tab when directly following dialogue', () => {
    const state = at(stateOf(blocks(['dialogue', 'Ciao.'], ['action', ''])), 8)
    const next = runTab(state, 'Tab')
    expect(next.doc.child(1).type.name).toBe('shot')
  })

  it('rotates shot to transition on Tab when directly following dialogue', () => {
    const state = at(stateOf(blocks(['dialogue', 'Ciao.'], ['shot', ''])), 8)
    const next = runTab(state, 'Tab')
    expect(next.doc.child(1).type.name).toBe('transition')
  })

  it('rotates parenthetical to dialogue on Tab', () => {
    const next = runTab(at(stateOf(blocks(['parenthetical', '(pausa)'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('dialogue')
  })

  it('rotates dialogue to transition on Tab when isolated', () => {
    const next = runTab(at(stateOf(blocks(['dialogue', 'ciao'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('transition')
  })

  it('rotates transition to scene_heading on Tab', () => {
    const next = runTab(at(stateOf(blocks(['transition', 'CUT TO:'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('scene_heading')
  })

  it('rotates scene_heading to action on Tab', () => {
    const next = runTab(at(stateOf(blocks(['scene_heading', 'INT. CASA - GIORNO'])), 2), 'Tab')
    expect(next.doc.child(0).type.name).toBe('action')
  })

  it('completes the full circular cycle without looping on dialogue/parenthetical', () => {
    let s = at(stateOf(blocks(['scene_heading', 'INT. CASA - GIORNO'])), 2)
    const expected = ['action', 'shot', 'character', 'parenthetical', 'dialogue', 'transition', 'scene_heading']
    for (const type of expected) {
      s = runTab(s, 'Tab')
      expect(s.doc.child(0).type.name).toBe(type)
    }
  })

  it('rotates backwards seamlessly on Shift-Tab', () => {
    let s = at(stateOf(blocks(['scene_heading', 'INT. CASA - GIORNO'])), 2)
    const expected = ['transition', 'dialogue', 'parenthetical', 'character', 'shot', 'action', 'scene_heading']
    for (const type of expected) {
      s = runTab(s, 'Shift-Tab')
      expect(s.doc.child(0).type.name).toBe(type)
    }
  })
})

describe('placeholderPlugin', () => {
  const ranges = (state: EditorState): [number, number][] => {
    const plugin = placeholderPlugin({ action: 'Azione' })
    const decos = plugin.props.decorations as unknown as (s: EditorState) => {
      find(): { from: number; to: number }[]
    }
    return decos(state).find().map((d) => [d.from, d.to] as [number, number])
  }

  it('labels only the empty block holding the cursor', () => {
    const state = at(stateOf(blocks(['action', ''], ['action', ''], ['action', ''])), 3)
    expect(ranges(state)).toEqual([[2, 4]])
  })

  it('labels nothing when the current block has text', () => {
    const state = at(stateOf(blocks(['action', 'test'], ['action', ''])), 2)
    expect(ranges(state)).toEqual([])
  })
})

describe('hardBreakKeymap', () => {
  it('inserts a soft break inside the current element', () => {
    const next = run(at(stateOf(blocks(['action', 'Ciao'])), 5), 'Shift-Enter')
    const inline = next.doc.child(0).content
    expect(inline.childCount).toBe(2)
    expect(inline.child(0).textContent).toBe('Ciao')
    expect(inline.child(1).type.name).toBe('hard_break')
  })
})

describe('parentheticalKeymap', () => {
  function runParen(state: EditorState, key: '(' | ')' | 'Backspace'): EditorState {
    const binding = parentheticalKeymap(screenplaySchema)[key]
    let current = state
    binding(state, (tr: Transaction) => {
      current = current.apply(tr)
    })
    return current
  }

  it('converts an empty dialogue block to parenthetical with () when typing (', () => {
    const state = at(stateOf(blocks(['dialogue', ''])), 1)
    const next = runParen(state, '(')
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('()')
    expect(next.selection.$from.parentOffset).toBe(1)
  })

  it('skips over closing parenthesis when typing ) inside parenthetical', () => {
    const state = at(stateOf(blocks(['parenthetical', '(sussurrando)'])), 13) // right before ')'
    const next = runParen(state, ')')
    expect(next.selection.$from.parentOffset).toBe(13) // right after ')'
  })

  it('converts completely empty parenthetical to action on Backspace', () => {
    const state = at(stateOf(blocks(['parenthetical', ''])), 1)
    const next = runParen(state, 'Backspace')
    expect(next.doc.child(0).type.name).toBe('action')
    expect(next.doc.child(0).textContent).toBe('')
  })

  it('clears (s) back to empty on Backspace', () => {
    const state = at(stateOf(blocks(['parenthetical', '(s)'])), 3) // posInBlock 2
    const next = runParen(state, 'Backspace')
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('')
  })

  it('clears empty () back to empty on Backspace', () => {
    const state = at(stateOf(blocks(['parenthetical', '()'])), 2) // inside between ( and )
    const next = runParen(state, 'Backspace')
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('')
  })

  it('automatically adds closing parenthesis on Enter if missing', () => {
    const state = at(stateOf(blocks(['parenthetical', '(pausa'])), 7)
    const next = run(state, 'Enter')
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('(pausa)')
    expect(next.doc.child(1).type.name).toBe('dialogue')
    expect(next.doc.child(1).textContent).toBe('')
  })
})

describe('parentheticalPlugin', () => {
  function runInput(state: EditorState, text: string, auto = true): EditorState {
    const plugin = parentheticalPlugin(screenplaySchema, () => auto)
    let current = state
    const mockView = {
      state: current,
      dispatch: (tr: Transaction) => {
        current = current.apply(tr)
      },
    } as unknown as EditorView
    const { from, to } = state.selection
    const handler = plugin.props.handleTextInput as unknown as (view: EditorView, from: number, to: number, text: string) => boolean | void
    handler(mockView, from, to, text)
    return current
  }

  it('automatically wraps typed text in () when block is empty and places cursor before )', () => {
    const state = at(stateOf(blocks(['parenthetical', ''])), 1)
    const next = runInput(state, 's')
    expect(next.doc.child(0).textContent).toBe('(s)')
    expect(next.selection.$from.parentOffset).toBe(2) // between 's' and ')'
  })

  it('does NOT wrap typed text in () when autoParentheses is false', () => {
    const state = at(stateOf(blocks(['parenthetical', ''])), 1)
    const next = runInput(state, 's', false)
    // When auto is false, handleTextInput returns false and does not auto-insert ()
    expect(next.doc.child(0).textContent).toBe('')
  })

  it('wraps typed ( into () with cursor inside', () => {
    const state = at(stateOf(blocks(['parenthetical', ''])), 1)
    const next = runInput(state, '(')
    expect(next.doc.child(0).textContent).toBe('()')
    expect(next.selection.$from.parentOffset).toBe(1)
  })

  it('steps past closing parenthesis when typing ) right before )', () => {
    const state = at(stateOf(blocks(['parenthetical', '(sussurrando)'])), 13) // offset 12 before ')'
    const next = runInput(state, ')')
    expect(next.selection.$from.parentOffset).toBe(13)
  })

  it('does not force parentheses on Enter when autoParentheses is false', () => {
    const binding = enterKeymap(screenplaySchema, () => false).Enter
    const state = at(stateOf(blocks(['parenthetical', 'sussurrando'])), 12)
    let next = state
    binding(state, (tr: Transaction) => {
      next = next.apply(tr)
    })
    expect(next.doc.childCount).toBe(2)
    expect(next.doc.child(0).type.name).toBe('parenthetical')
    expect(next.doc.child(0).textContent).toBe('sussurrando')
    expect(next.doc.child(1).type.name).toBe('dialogue')
    expect(next.doc.child(1).textContent).toBe('')
  })
})

