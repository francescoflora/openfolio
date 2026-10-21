import { describe, expect, it } from 'vitest'
import { LANGUAGES, elementLabel, elementLabels, normalizeLanguage, statusLabels, uiText } from './i18n'

describe('i18n', () => {
  it('defaults to Italian', () => {
    expect(normalizeLanguage(undefined)).toBe('it')
    expect(normalizeLanguage('xx')).toBe('it')
    expect(normalizeLanguage('en')).toBe('en')
  })

  it('offers Italian first', () => {
    expect(LANGUAGES[0]!.id).toBe('it')
  })

  it('localizes element labels, Italian by default', () => {
    expect(elementLabels('it').dialogue).toBe('Dialogo')
    expect(elementLabels('en').dialogue).toBe('Dialogue')
    expect(elementLabels(undefined)).toEqual(elementLabels('it'))
    expect(elementLabel(undefined, 'character')).toBe('Personaggio')
  })

  it('localizes status labels', () => {
    expect(statusLabels('it').draft).toBe('Bozza')
    expect(statusLabels('en').draft).toBe('Draft')
    expect(statusLabels(undefined).final).toBe('Finale')
  })

  it('localizes application UI strings in Italian and English', () => {
    expect(uiText('it').undoTitle).toContain('Annulla')
    expect(uiText('en').undoTitle).toContain('Undo')
    expect(uiText('it').redoTitle).toContain('Ripeti')
    expect(uiText('en').redoTitle).toContain('Redo')
    expect(uiText('en').saveBtn).toBe('Save')
    expect(uiText('it').updateAvailable('0.1.3')).toBe('v0.1.3')
    expect(uiText('it').updateAvailable('v0.1.3')).toBe('v0.1.3')
    expect(uiText('en').updateAvailable('0.1.3')).toBe('v0.1.3')
    expect(uiText('it').updateConfirmProceed).toBe("Procedi con l'aggiornamento")
    expect(uiText('en').updateConfirmProceed).toBe('Proceed with update')
  })
})
