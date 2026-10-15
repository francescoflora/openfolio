import { describe, expect, it } from 'vitest'
import { parseFdx, serializeFdx } from './fdx'
import type { SceneDoc } from './json'

const scene: SceneDoc = {
  type: 'doc',
  content: [
    { type: 'scene_heading', content: [{ type: 'text', text: 'INT. CASA - NOTTE' }] },
    { type: 'action', content: [{ type: 'text', text: 'Piove & tuona.' }] },
    { type: 'character', content: [{ type: 'text', text: 'LUCIA' }] },
    { type: 'dialogue', content: [{ type: 'text', text: 'Chi c\u2019\u00e8?' }] },
  ],
}

describe('fdx', () => {
  it('round-trips a scene', () => {
    const xml = serializeFdx([scene])
    const back = parseFdx(xml)
    expect(back).toHaveLength(1)
    expect(back[0]!.content.map((n) => n.type)).toEqual(['scene_heading', 'action', 'character', 'dialogue'])
    expect(back[0]!.content[1]!.content![0]!.text).toBe('Piove & tuona.')
  })

  it('splits multiple scenes at scene headings', () => {
    const two: SceneDoc = {
      type: 'doc',
      content: [
        { type: 'scene_heading', content: [{ type: 'text', text: 'INT. A - DAY' }] },
        { type: 'action', content: [{ type: 'text', text: 'Uno.' }] },
        { type: 'scene_heading', content: [{ type: 'text', text: 'EXT. B - DAY' }] },
        { type: 'action', content: [{ type: 'text', text: 'Due.' }] },
      ],
    }
    const back = parseFdx(serializeFdx([two]))
    expect(back).toHaveLength(2)
    expect(back[1]!.content[0]!.content![0]!.text).toBe('EXT. B - DAY')
  })
})
