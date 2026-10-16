import { Schema } from 'prosemirror-model'
import { revisionMarkSpec } from './marks'

export const SCREENPLAY_ELEMENTS = [
  'scene_heading',
  'action',
  'shot',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
] as const

export type ElementType = (typeof SCREENPLAY_ELEMENTS)[number]

function block(name: ElementType) {
  return {
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: `div[data-el="${name}"]` }],
    toDOM: () => ['div', { 'data-el': name, class: `el-${name}` }, 0] as const,
  }
}

const nodes = Object.fromEntries(SCREENPLAY_ELEMENTS.map((e) => [e, block(e)]))

export const screenplaySchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    ...nodes,
    text: { group: 'inline' },
    hard_break: {
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [{ tag: 'br' }],
      toDOM: () => ['br'] as const,
    },
  },
  marks: {
    revision: revisionMarkSpec,
  },
})

/** Enter: "carriage return" forward move through the screenplay flow. */
export const ENTER_TARGET: Record<ElementType, ElementType> = {
  scene_heading: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'character',
  transition: 'scene_heading',
  shot: 'action',
}

/** Smart contextual Tab forward map (circular: Scene Heading -> Action -> Shot -> Character -> Parenthetical -> Dialogue -> Transition -> Scene Heading). */
export const SMART_TAB_FORWARD: Record<ElementType, ElementType> = {
  scene_heading: 'action',
  action: 'shot',
  shot: 'character',
  character: 'parenthetical',
  parenthetical: 'dialogue',
  dialogue: 'transition',
  transition: 'scene_heading',
}

/** Smart contextual Shift-Tab backward map (exact inverse of SMART_TAB_FORWARD). */
export const SMART_TAB_BACKWARD: Record<ElementType, ElementType> = {
  scene_heading: 'transition',
  transition: 'dialogue',
  dialogue: 'parenthetical',
  parenthetical: 'character',
  character: 'shot',
  shot: 'action',
  action: 'scene_heading',
}

export function tabTarget(current: ElementType, dir: 1 | -1): ElementType {
  if (dir === 1) {
    return SMART_TAB_FORWARD[current] ?? 'action'
  }
  return SMART_TAB_BACKWARD[current] ?? 'action'
}

/** A line beginning with these tokens forces this element type (like Fountain + Italian standard). */
export const KEYWORD_RULES: { re: RegExp; type: ElementType }[] = [
  { re: /^(INT|EST|EXT|INTERNO|ESTERNO|INT\.\/EXT|I\/E)[ .]/i, type: 'scene_heading' },
  { re: /^(FADE (IN|OUT)|CUT TO|DISSOLVE TO|SMASH CUT|MATCH CUT|STACCO SU|STACCO|DISSOLVENZA|DISSOLVENZA IN ENTRATA|DISSOLVENZA IN USCITA|FINE)[:.]?$/i, type: 'transition' },
]
