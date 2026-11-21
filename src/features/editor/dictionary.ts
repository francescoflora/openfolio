import type { Language } from '@/core/types'
import type { SpellChecker } from './spellcheck'

const cache = new Map<Language, Promise<SpellChecker>>()

async function createChecker(lang: Language): Promise<SpellChecker> {
  const [{ Espells }, aff, dic] = await Promise.all([
    import('espells'),
    lang === 'en' ? import('./dictionaries/en.aff?raw') : import('./dictionaries/it.aff?raw'),
    lang === 'en' ? import('./dictionaries/en.dic?raw') : import('./dictionaries/it.dic?raw'),
  ])
  const spell = new Espells({ aff: aff.default, dic: dic.default })
  const correct = (word: string): boolean => {
    if (spell.lookup(word, true).correct) return true
    const lower = word.toLowerCase()
    if (lower !== word && spell.lookup(lower, true).correct) return true
    const title = lower.charAt(0).toUpperCase() + lower.slice(1)
    return title !== word && spell.lookup(title, true).correct
  }
  return { correct }
}

export function loadChecker(lang: Language): Promise<SpellChecker> {
  let pending = cache.get(lang)
  if (!pending) {
    pending = createChecker(lang).catch((err) => {
      cache.delete(lang)
      throw err
    })
    cache.set(lang, pending)
  }
  return pending
}
