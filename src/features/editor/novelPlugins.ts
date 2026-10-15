import { Plugin } from 'prosemirror-state'
import type { EditorState, Transaction } from 'prosemirror-state'
import type { NodeType, Schema } from 'prosemirror-model'
import { setBlockType, splitBlock } from 'prosemirror-commands'
import { inputRules, textblockTypeInputRule } from 'prosemirror-inputrules'

/**
 * Novel keymap:
 * When on a heading (Chapter), pressing Enter creates an indented paragraph below it,
 * allowing the writer to seamlessly jump from the chapter number to the indented first paragraph.
 */
export function novelKeymap(schema: Schema) {
  return {
    Enter: (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
      const { $from } = state.selection
      const currentType = $from.parent.type.name
      const text = $from.parent.textContent

      if (currentType === 'heading') {
        const paragraph = schema.nodes.paragraph as NodeType | undefined
        if (!paragraph) return false

        // If the heading is empty, hitting Enter converts it to paragraph
        if (text.trim() === '') {
          return setBlockType(paragraph)(state, dispatch)
        }

        // Otherwise split and set the new block to paragraph
        let splitState: EditorState | null = null
        const split = splitBlock(state, (tr) => {
          splitState = state.apply(tr)
          if (dispatch) dispatch(tr)
        })
        if (!split) return false
        if (dispatch && splitState) {
          setBlockType(paragraph)(splitState, dispatch)
        }
        return true
      }

      return false
    },
  }
}

/** Input rules for novel mode: `# ` converts block to chapter heading (H1). */
export function novelInputRules(schema: Schema): Plugin {
  const heading = schema.nodes.heading
  if (!heading) return new Plugin({})

  return inputRules({
    rules: [
      textblockTypeInputRule(/^#\s$/, heading, { level: 1 }),
    ],
  })
}
