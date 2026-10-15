import { describe, it, expect } from 'vitest'
import {
  nativeExportFountain,
  nativeImportFountain,
  nativeExportFdx,
  nativeImportFdx,
  nativeExportPdf,
} from './native'
import type { SceneDoc } from './json'

describe('native bridge fallbacks', () => {
  const sampleScene: SceneDoc = {
    type: 'doc',
    content: [
      {
        type: 'scene_heading',
        content: [{ type: 'text', text: 'INT. STUDIO - DAY' }],
      },
      {
        type: 'action',
        content: [{ type: 'text', text: 'The writer works on the keyboard.' }],
      },
    ],
  }

  it('exports and imports fountain via fallback', async () => {
    const text = await nativeExportFountain([sampleScene])
    expect(text).toContain('INT. STUDIO - DAY')
    expect(text).toContain('The writer works on the keyboard.')

    const docs = await nativeImportFountain(text)
    expect(docs.length).toBeGreaterThan(0)
    expect(docs[0]?.content[0]?.type).toBe('scene_heading')
  })

  it('exports and imports fdx via fallback', async () => {
    const xml = await nativeExportFdx([sampleScene])
    expect(xml).toContain('<Paragraph Type="Scene Heading">')
    expect(xml).toContain('INT. STUDIO - DAY')

    const docs = await nativeImportFdx(xml)
    expect(docs.length).toBeGreaterThan(0)
    expect(docs[0]?.content[0]?.type).toBe('scene_heading')
  })

  it('gracefully returns null for nativeExportPdf when not in tauri', async () => {
    const result = await nativeExportPdf({
      title: 'Test',
      mode: 'screenplay',
      scenes: [sampleScene],
    })
    expect(result).toBeNull()
  })
})
