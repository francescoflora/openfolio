import { describe, expect, it } from 'vitest'
import { AVAILABLE_FONTS } from './FontModal'
import { newProject } from '@/store/useProject'
import { compileHtml } from '@/core/compile'
import {
  loadDefaultAutoParentheses,
  loadDefaultElementFonts,
  resetDefaultAutoParentheses,
  resetDefaultElementFonts,
  saveDefaultAutoParentheses,
  saveDefaultElementFonts,
} from '@/core/persistence'

describe('FontModal & Element Fonts', () => {
  it('provides rich font options including predefinito', () => {
    expect(AVAILABLE_FONTS.length).toBeGreaterThan(5)
    expect(AVAILABLE_FONTS[0].id).toBe('')
    expect(AVAILABLE_FONTS.some((f) => f.label.includes('Courier Prime'))).toBe(true)
    expect(AVAILABLE_FONTS.some((f) => f.label.includes('EB Garamond'))).toBe(true)
    expect(AVAILABLE_FONTS.some((f) => f.label.includes('Inter'))).toBe(true)
  })

  it('injects element font overrides into compileHtml output', () => {
    const { project, scenes } = newProject('novel', 'Test Novel', {
      elementFonts: {
        heading: "'Cinzel', serif",
        paragraph: "'Lora', serif",
      },
    })

    const html = compileHtml(project, scenes, false)
    expect(html).toContain(".novel h1, .novel h2, .novel h3 { font-family: 'Cinzel', serif !important; }")
    expect(html).toContain(".novel p { font-family: 'Lora', serif !important; }")
  })

  it('injects screenplay element font overrides into compileHtml output', () => {
    const { project, scenes } = newProject('screenplay', 'Test Script', {
      elementFonts: {
        action: "'Courier New', monospace",
        dialogue: "'Georgia', serif",
      },
    })

    const html = compileHtml(project, scenes, true)
    expect(html).toContain(".script-page .el-action { font-family: 'Courier New', monospace !important; }")
    expect(html).toContain(".script-page .el-dialogue { font-family: 'Georgia', serif !important; }")
  })

  it('persists tool defaults and restores software defaults with reset', () => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    }
    const orig = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true })

    try {
      // Save custom tool defaults for screenplay
      saveDefaultElementFonts('screenplay', { action: "'Courier New', monospace" })
      expect(loadDefaultElementFonts('screenplay')).toEqual({ action: "'Courier New', monospace" })

      // A newly created screenplay project inherits the tool defaults
      const p = newProject('screenplay', 'Inherited Test')
      expect(p.project.settings.elementFonts).toEqual({ action: "'Courier New', monospace" })

      // Reset software defaults
      resetDefaultElementFonts('screenplay')
      expect(loadDefaultElementFonts('screenplay')).toEqual({})

      // After reset, a new screenplay project starts with pure software defaults
      const p2 = newProject('screenplay', 'Clean Test')
      expect(p2.project.settings.elementFonts).toEqual({})
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: orig, configurable: true, writable: true })
    }
  })

  it('manages autoParentheses setting with true by default and respects persistence', () => {
    // Default project has autoParentheses === true
    const p = newProject('screenplay', 'Auto Paren Test')
    expect(p.project.settings.autoParentheses).toBe(true)

    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    }
    const orig = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true, writable: true })

    try {
      expect(loadDefaultAutoParentheses()).toBe(true)

      saveDefaultAutoParentheses(false)
      expect(loadDefaultAutoParentheses()).toBe(false)

      const pDisabled = newProject('screenplay', 'Disabled Auto Paren')
      expect(pDisabled.project.settings.autoParentheses).toBe(false)

      resetDefaultAutoParentheses()
      expect(loadDefaultAutoParentheses()).toBe(true)

      const pReset = newProject('screenplay', 'Restored Auto Paren')
      expect(pReset.project.settings.autoParentheses).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: orig, configurable: true, writable: true })
    }
  })
})
