import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { NodeType, Schema } from 'prosemirror-model'
import { setBlockType, splitBlock } from 'prosemirror-commands'
import { inputRules, textblockTypeInputRule } from 'prosemirror-inputrules'
import { ENTER_TARGET, KEYWORD_RULES, SCREENPLAY_ELEMENTS, tabTarget } from '@/core/schema/screenplay'
import type { ElementType } from '@/core/schema/screenplay'
import { DEFAULT_LANGUAGE, elementLabels } from '@/core/i18n'
import type { Language } from '@/core/types'

function currentType(state: EditorState): ElementType {
  return state.selection.$from.parent.type.name as ElementType
}

function blockText(state: EditorState): string {
  return state.selection.$from.parent.textContent
}

export function makeSetType(schema: Schema, name: string) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const type = schema.nodes[name] as NodeType | undefined
    if (!type) return false

    const { $from } = state.selection
    const current = $from.parent.type.name
    const text = $from.parent.textContent

    // Converting TO parenthetical: keep empty if empty so placeholder preview shows, or wrap existing text
    if (name === 'parenthetical') {
      const blockStart = $from.start()
      const blockEnd = $from.end()
      let tr = state.tr
      tr = tr.setNodeMarkup(blockStart - 1, type)

      if (text.trim() === '' || text.trim() === '()' || text.trim() === '( )') {
        tr = tr.delete(blockStart, blockEnd)
        tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
      } else {
        const inner = text.replace(/^\(/, '').replace(/\)$/, '').trim()
        if (inner === '') {
          tr = tr.delete(blockStart, blockEnd)
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
        } else {
          const wrapped = `(${inner})`
          if (text !== wrapped) {
            tr = tr.delete(blockStart, blockEnd)
            tr = tr.insertText(wrapped, blockStart)
          }
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart + wrapped.length - 1))
        }
      }
      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    }

    // Converting FROM parenthetical to another block: strip () if empty or outer parens
    if (current === 'parenthetical') {
      const blockStart = $from.start()
      const blockEnd = $from.end()
      let tr = state.tr
      tr = tr.setNodeMarkup(blockStart - 1, type)

      if (text.trim() === '()' || text.trim() === '( )' || text.trim() === '') {
        tr = tr.delete(blockStart, blockEnd)
        tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
      } else {
        const stripped = text.replace(/^\(/, '').replace(/\)$/, '').trim()
        if (stripped !== text) {
          tr = tr.delete(blockStart, blockEnd)
          tr = tr.insertText(stripped, blockStart)
        }
      }
      if (dispatch) dispatch(tr.scrollIntoView())
      return true
    }

    return setBlockType(type)(state, dispatch)
  }
}

/** Auto-enclosing parentheses and skip behavior for parenthetical element. */
export function parentheticalKeymap(schema: Schema, getAutoParentheses?: () => boolean) {
  const isAuto = () => (getAutoParentheses ? getAutoParentheses() : true)

  return {
    '(': (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const parenthetical = schema.nodes.parenthetical
      if (!parenthetical) return false

      const { $from } = state.selection
      const type = $from.parent.type.name
      const text = $from.parent.textContent
      const posInBlock = $from.parentOffset

      // If already parenthetical and cursor is before existing '(', step past it
      if (type === 'parenthetical') {
        if (isAuto() && posInBlock === 0 && text.startsWith('(')) {
          if (dispatch) {
            dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.pos + 1)))
          }
          return true
        }
        return false
      }

      // If at start of block or block is empty, convert to parenthetical
      if (posInBlock === 0 || text.trim() === '') {
        const blockStart = $from.start()
        const blockEnd = $from.end()
        let tr = state.tr
        tr = tr.setNodeMarkup(blockStart - 1, parenthetical)
        if (isAuto()) {
          tr = tr.delete(blockStart, blockEnd).insertText('()', blockStart)
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart + 1))
        } else {
          tr = tr.delete(blockStart, blockEnd)
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
        }
        if (dispatch) dispatch(tr.scrollIntoView())
        return true
      }

      return false
    },

    ')': (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const { $from } = state.selection
      const type = $from.parent.type.name
      if (type !== 'parenthetical' || !isAuto()) return false

      const text = $from.parent.textContent
      const posInBlock = $from.parentOffset

      // If next char is ')', skip over it
      if (posInBlock < text.length && text[posInBlock] === ')') {
        if (dispatch) {
          dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.pos + 1)))
        }
        return true
      }
      return false
    },

    Backspace: (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const { $from, empty } = state.selection
      const type = $from.parent.type.name
      if (type !== 'parenthetical' || !empty) return false

      const text = $from.parent.textContent
      const posInBlock = $from.parentOffset
      const actionType = schema.nodes.action as NodeType | undefined

      // If block is completely empty "" -> Backspace converts it back to action
      if (text === '') {
        if (actionType) {
          const blockStart = $from.start()
          let tr = state.tr.setNodeMarkup(blockStart - 1, actionType)
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
          if (dispatch) dispatch(tr)
          return true
        }
      }

      if (!isAuto()) return false

      // If inside empty parenthetical "()" or "( )" -> reset to empty "" so placeholder preview shows
      if (text === '()' || text === '( )') {
        const blockStart = $from.start()
        const blockEnd = $from.end()
        let tr = state.tr.delete(blockStart, blockEnd)
        tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
        if (dispatch) dispatch(tr)
        return true
      }

      // If block has a single character inside parens like "(s)" and cursor is at pos 2 (after 's')
      // Deleting that character resets the block to empty "" so preview shows
      if (/^\(.\)$/.test(text) && posInBlock === 2) {
        const blockStart = $from.start()
        const blockEnd = $from.end()
        let tr = state.tr.delete(blockStart, blockEnd)
        tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
        if (dispatch) dispatch(tr)
        return true
      }

      return false
    },
  }
}

/**
 * ProseMirror plugin for parenthetical block behavior:
 * - When typing in an empty parenthetical block, automatically wraps the typed character in `(...)`.
 * - Positions the cursor inside the parentheses, right after the typed character.
 * - If user types `)` right before a closing `)`, steps over it.
 * - Automatically wraps pasted content in parentheses when pasted into an empty parenthetical.
 */
export function parentheticalPlugin(_schema?: Schema, getAutoParentheses?: () => boolean): Plugin {
  const isAuto = () => (getAutoParentheses ? getAutoParentheses() : true)

  return new Plugin({
    key: new PluginKey('parentheticalPlugin'),
    props: {
      handleTextInput(view, from, to, text) {
        if (!isAuto()) return false

        const { state } = view
        const { $from } = state.selection
        if ($from.parent.type.name !== 'parenthetical') return false

        const blockText = $from.parent.textContent
        const blockStart = $from.start()
        const blockEnd = $from.end()
        const isSelectingAll = from === blockStart && to === blockEnd

        // 1. If block is empty (or entire block selected), auto-insert parentheses around the typed character(s)
        if (blockText === '' || isSelectingAll) {
          if (text === '(' || text === ')') {
            let tr = state.tr
            if (isSelectingAll) tr = tr.delete(blockStart, blockEnd)
            tr = tr.insertText('()', blockStart)
            tr.setSelection(TextSelection.create(tr.doc, blockStart + 1))
            view.dispatch(tr)
            return true
          }

          // User typed a letter or symbol: wrap it in ()
          const wrapped = `(${text})`
          let tr = state.tr
          if (isSelectingAll) tr = tr.delete(blockStart, blockEnd)
          tr = tr.insertText(wrapped, blockStart)
          // Put cursor immediately after typed text, before the closing ')'
          tr.setSelection(TextSelection.create(tr.doc, blockStart + 1 + text.length))
          view.dispatch(tr)
          return true
        }

        // 2. If user types ')' and cursor is right before an existing ')', step over it
        if (text === ')') {
          const posInBlock = $from.parentOffset
          if (posInBlock < blockText.length && blockText[posInBlock] === ')') {
            view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.pos + 1)))
            return true
          }
        }

        return false
      },

      handlePaste(view, _event, slice) {
        if (!isAuto()) return false

        const { state } = view
        const { $from } = state.selection
        if ($from.parent.type.name !== 'parenthetical') return false

        const blockText = $from.parent.textContent
        const blockStart = $from.start()
        const blockEnd = $from.end()
        const isSelectingAll = state.selection.from === blockStart && state.selection.to === blockEnd

        if (blockText === '' || isSelectingAll) {
          const raw = slice.content.textBetween(0, slice.content.size).trim()
          if (!raw) return false
          const inner = raw.replace(/^\(/, '').replace(/\)$/, '').trim()
          const wrapped = `(${inner})`
          let tr = state.tr
          if (isSelectingAll) tr = tr.delete(blockStart, blockEnd)
          tr = tr.insertText(wrapped, blockStart)
          tr.setSelection(TextSelection.create(tr.doc, blockStart + wrapped.length - 1))
          view.dispatch(tr)
          return true
        }
        return false
      },
    },
  })
}

/** Shift-Enter: a soft line break inside the current element (Final Draft soft return). */
export function hardBreakKeymap(schema: Schema) {
  return {
    'Shift-Enter': (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const hardBreak = schema.nodes.hard_break
      const { $from } = state.selection
      if (!hardBreak || !$from.parent.isTextblock) return false
      if (dispatch) dispatch(state.tr.replaceSelectionWith(hardBreak.create()).scrollIntoView())
      return true
    },
  }
}

function prevBlockType(state: EditorState): ElementType | null {
  const { $from } = state.selection
  const index = $from.index(0)
  if (index > 0) {
    return state.doc.child(index - 1).type.name as ElementType
  }
  return null
}

/** Tab / Shift-Tab rotate the current element, Final Draft style. */
export function tabKeymap(schema: Schema) {
  return {
    Tab: (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const type = currentType(state)
      const prev = prevBlockType(state)

      // 1. Line directly preceded by character (between character and dialogue):
      // The parenthetical belongs here! Toggling between dialogue and parenthetical.
      if (prev === 'character') {
        if (type === 'dialogue') {
          return makeSetType(schema, 'parenthetical')(state, dispatch)
        }
        if (type === 'parenthetical') {
          return makeSetType(schema, 'dialogue')(state, dispatch)
        }
      }

      // 2. Line directly preceded by dialogue (after dialogue):
      // Allows rotating through character -> parenthetical (perifrasi) -> dialogue -> action -> transition -> scene_heading
      if (prev === 'dialogue') {
        const afterDialogueForward: Record<ElementType, ElementType> = {
          character: 'parenthetical',
          parenthetical: 'dialogue',
          dialogue: 'action',
          action: 'transition',
          transition: 'scene_heading',
          scene_heading: 'character',
          shot: 'action',
        }
        const target = afterDialogueForward[type] ?? 'parenthetical'
        return makeSetType(schema, target)(state, dispatch)
      }

      // 3. Default circular cycle:
      const target = tabTarget(type, 1)
      return makeSetType(schema, target)(state, dispatch)
    },

    'Shift-Tab': (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const type = currentType(state)
      const prev = prevBlockType(state)

      // Directly after character: toggle between dialogue and parenthetical
      if (prev === 'character') {
        if (type === 'parenthetical') {
          return makeSetType(schema, 'dialogue')(state, dispatch)
        }
        if (type === 'dialogue') {
          return makeSetType(schema, 'parenthetical')(state, dispatch)
        }
      }

      // Directly after dialogue: rotate backwards including parenthetical
      if (prev === 'dialogue') {
        const afterDialogueBackward: Record<ElementType, ElementType> = {
          character: 'scene_heading',
          scene_heading: 'transition',
          transition: 'action',
          action: 'dialogue',
          dialogue: 'parenthetical',
          parenthetical: 'character',
          shot: 'action',
        }
        const target = afterDialogueBackward[type] ?? 'character'
        return makeSetType(schema, target)(state, dispatch)
      }

      const target = tabTarget(type, -1)
      return makeSetType(schema, target)(state, dispatch)
    },
  }
}

/** Enter moves forward through the screenplay flow with a fresh block. */
export function enterKeymap(schema: Schema, getAutoParentheses?: () => boolean) {
  const isAuto = () => (getAutoParentheses ? getAutoParentheses() : true)

  return {
    Enter: (state: EditorState, dispatch?: (tr: Transaction) => void) => {
      const type = currentType(state)
      const text = blockText(state)

      // Double-enter escape: pressing Enter on an empty character, parenthetical, or dialogue block converts it to action
      const isEmpty =
        text.trim() === '' ||
        (type === 'parenthetical' && (text.trim() === '()' || text.trim() === '( )'))

      if (isEmpty && (type === 'character' || type === 'parenthetical' || type === 'dialogue')) {
        const actionType = schema.nodes.action as NodeType | undefined
        if (actionType) {
          const { $from } = state.selection
          const blockStart = $from.start()
          const blockEnd = $from.end()
          let tr = state.tr.delete(blockStart, blockEnd)
          tr = tr.setNodeMarkup(blockStart - 1, actionType)
          tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
          if (dispatch) dispatch(tr)
          return true
        }
      }

      // If parenthetical, ensure closing parenthesis and split to dialogue cleanly without pushing ')' down
      if (type === 'parenthetical') {
        const dialogueType = schema.nodes.dialogue as NodeType | undefined
        if (!dialogueType) return false

        const { $from } = state.selection
        const blockStart = $from.start()
        const blockEnd = $from.end()
        const auto = isAuto()

        let formatted = text.trim()
        if (auto) {
          const inner = text.replace(/^\(/, '').replace(/\)$/, '').trim()
          if (inner === '') {
            // Double enter or enter on empty parenthetical: convert to action
            const actionType = schema.nodes.action as NodeType | undefined
            if (actionType) {
              let tr = state.tr.delete(blockStart, blockEnd)
              tr = tr.setNodeMarkup(blockStart - 1, actionType)
              tr = tr.setSelection(TextSelection.create(tr.doc, blockStart))
              if (dispatch) dispatch(tr)
              return true
            }
            return false
          }
          formatted = `(${inner})`
        }

        let tr = state.tr
        if (text !== formatted) {
          tr = tr.delete(blockStart, blockEnd).insertText(formatted, blockStart)
        }

        const endPos = blockStart + formatted.length
        tr = tr.split(endPos, 1, [{ type: dialogueType }])
        tr = tr.setSelection(TextSelection.create(tr.doc, endPos + 2))
        if (dispatch) dispatch(tr.scrollIntoView())
        return true
      }

      const keyword = KEYWORD_RULES.find((r) => r.re.test(text.trim()))
      const target: ElementType = keyword ? ENTER_TARGET[keyword.type] : (ENTER_TARGET[type] ?? 'action')

      let splitState: EditorState | null = null
      const split = splitBlock(state, (tr) => {
        splitState = state.apply(tr)
        if (dispatch) dispatch(tr)
      })
      if (!split) return false
      if (!dispatch || !splitState) return true

      const nodeType = schema.nodes[target] as NodeType | undefined
      if (nodeType) setBlockType(nodeType)(splitState, dispatch)
      return true
    },
  }
}

const keywordRules = (schema: Schema) =>
  KEYWORD_RULES.flatMap((r) => {
    const node = schema.nodes[r.type]
    return node ? [textblockTypeInputRule(new RegExp(r.re.source), node)] : []
  })

export function screenplayInputRules(schema: Schema) {
  const rules = keywordRules(schema)
  return inputRules({ rules })
}

/** Adds `is-empty` + placeholder only to the empty top-level block holding the cursor. */
export function placeholderPlugin(
  placeholders: Partial<Record<string, string>> | (() => Partial<Record<string, string>>),
): Plugin {
  const key = new PluginKey('placeholder')
  return new Plugin({
    key,
    props: {
      decorations(state) {
        const map = typeof placeholders === 'function' ? placeholders() : placeholders
        const decos: Decoration[] = []
        const current = state.selection.$from.index(0)
        state.doc.forEach((node, offset, index) => {
          if (index !== current) return
          const hasText = node.content.size > 0
          const placeholder = map[node.type.name]
          if (!hasText && placeholder) {
            decos.push(
              Decoration.node(offset, offset + node.nodeSize, {
                class: 'is-empty',
                'data-placeholder': placeholder,
              }),
            )
          }
        })
        return DecorationSet.create(state.doc, decos)
      },
    },
  })
}

export function elementPlaceholders(lang?: Language): Partial<Record<string, string>> {
  const labels = elementLabels(lang)
  const isIt = (lang ?? DEFAULT_LANGUAGE) === 'it'
  return {
    ...Object.fromEntries(SCREENPLAY_ELEMENTS.map((k) => [k, labels[k]])),
    parenthetical: isIt ? '(parentetica)' : '(parenthetical)',
  }
}
