import { describe, expect, it } from 'vitest'
import { parseFountain, parseFountainScenes, serializeScene } from './fountain'
import { countWords } from './stats'
import { projectFromScenes } from '@/store/useProject'
import type { JSONContent } from './json'

const doc: JSONContent = {
  type: 'doc',
  content: [
    { type: 'scene_heading', content: [{ type: 'text', text: 'INT. CUCINA - GIORNO' }] },
    { type: 'action', content: [{ type: 'text', text: 'Anna versa il caffè.' }] },
    { type: 'character', content: [{ type: 'text', text: 'ANNA' }] },
    { type: 'parenthetical', content: [{ type: 'text', text: 'sussurrando' }] },
    { type: 'dialogue', content: [{ type: 'text', text: 'Sei tornato.' }] },
  ],
}

describe('fountain', () => {
  it('round-trips a scene', () => {
    const text = serializeScene(doc)
    const back = parseFountain(text)
    expect(back.map((n) => n.type)).toEqual(['scene_heading', 'action', 'character', 'parenthetical', 'dialogue'])
    expect(back[2]!.content![0]!.text).toBe('ANNA')
    expect(back[3]!.content![0]!.text).toBe('(sussurrando)')
    expect(back[4]!.content![0]!.text).toBe('Sei tornato.')
  })

  it('counts words across elements', () => {
    expect(countWords(doc)).toBe(4 + 4 + 1 + 1 + 2)
  })

  it('keeps a soft break inside one action block', () => {
    const multi: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'action',
          content: [{ type: 'text', text: 'Riga uno' }, { type: 'hard_break' }, { type: 'text', text: 'Riga due' }],
        },
      ],
    }
    const back = parseFountain(serializeScene(multi))
    expect(back).toHaveLength(1)
    expect(back[0]!.type).toBe('action')
    expect(back[0]!.content!.map((n) => n.type ?? 'text')).toEqual(['text', 'hard_break', 'text'])
    expect(back[0]!.content![0]!.text).toBe('Riga uno')
    expect(back[0]!.content![2]!.text).toBe('Riga due')
  })

  it('keeps blank-line separated action as separate blocks', () => {
    const two: JSONContent = {
      type: 'doc',
      content: [
        { type: 'action', content: [{ type: 'text', text: 'Uno' }] },
        { type: 'action', content: [{ type: 'text', text: 'Due' }] },
      ],
    }
    const back = parseFountain(serializeScene(two))
    expect(back.map((n) => n.type)).toEqual(['action', 'action'])
  })

  it('splits multi-scene Fountain script and extracts scene heading titles into binder', () => {
    const script = 'INT. UFFICIO - GIORNO\n\nMarco entra.\n\nEXT. STRADA - NOTTE\n\nPiove.'
    const docs = parseFountainScenes(script)
    expect(docs).toHaveLength(2)
    const { project } = projectFromScenes('Copione', docs, 'screenplay')
    expect(project.binder.map((b) => b.title)).toEqual(['INT. UFFICIO - GIORNO', 'EXT. STRADA - NOTTE'])
  })
})
