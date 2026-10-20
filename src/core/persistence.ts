import type { Language, ProjectMode } from './types'
import { DEFAULT_LANGUAGE } from './types'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// ---------------------------------------------------------------------------
// Global UI + default project language
// ---------------------------------------------------------------------------

const LANGUAGE_KEY = 'openfolio.language'

export function hasStoredLanguage(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LANGUAGE_KEY) !== null
  } catch {
    return false
  }
}

export function loadDefaultLanguage(): Language {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE
    const raw = localStorage.getItem(LANGUAGE_KEY)
    return raw === 'en' ? 'en' : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function saveDefaultLanguage(lang: Language): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Recent projects (desktop only). We remember the project file path + a little
// metadata; the document itself always lives on disk.
// ---------------------------------------------------------------------------

const RECENT_KEY = 'openfolio.recent'
export const MAX_RECENT = 8

export interface RecentProject {
  path: string
  title: string
  mode: ProjectMode
  modifiedAt: string
}

/** Pure upsert-by-path with a cap, newest first. */
export function upsertRecent(list: RecentProject[], entry: RecentProject, max = MAX_RECENT): RecentProject[] {
  return [entry, ...list.filter((r) => r.path !== entry.path)].slice(0, max)
}

export function listRecent(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentProject[]) : []
  } catch {
    return []
  }
}

export function addRecent(path: string, title: string, mode: ProjectMode): void {
  const entry: RecentProject = { path, title, mode, modifiedAt: new Date().toISOString() }
  localStorage.setItem(RECENT_KEY, JSON.stringify(upsertRecent(listRecent(), entry)))
}

export function removeRecent(path: string): void {
  localStorage.setItem(RECENT_KEY, JSON.stringify(listRecent().filter((r) => r.path !== path)))
}

export function clearRecents(): void {
  try {
    localStorage.removeItem(RECENT_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Per-project UI view state (last scene + scroll). UI-only, not document data.
// ---------------------------------------------------------------------------

const VIEW_KEY = 'openfolio.lastview'

export interface LastView {
  sceneId: string
  scrollTop: number
}

export function loadLastView(projectId: string): LastView | undefined {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, LastView>) : {}
    return map[projectId]
  } catch {
    return undefined
  }
}

export function saveLastView(projectId: string, view: LastView): void {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, LastView>) : {}
    map[projectId] = view
    localStorage.setItem(VIEW_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota / private mode */
  }
}

// ---------------------------------------------------------------------------
// Tool-wide default element fonts per mode
// ---------------------------------------------------------------------------

const DEFAULT_FONTS_KEY_PREFIX = 'openfolio.defaultElementFonts.'

export function loadDefaultElementFonts(mode: ProjectMode): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(`${DEFAULT_FONTS_KEY_PREFIX}${mode}`)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveDefaultElementFonts(mode: ProjectMode, fonts: Record<string, string>): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (!fonts || Object.keys(fonts).length === 0) {
      localStorage.removeItem(`${DEFAULT_FONTS_KEY_PREFIX}${mode}`)
    } else {
      localStorage.setItem(`${DEFAULT_FONTS_KEY_PREFIX}${mode}`, JSON.stringify(fonts))
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetDefaultElementFonts(mode?: ProjectMode): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (mode) {
      localStorage.removeItem(`${DEFAULT_FONTS_KEY_PREFIX}${mode}`)
    } else {
      localStorage.removeItem(`${DEFAULT_FONTS_KEY_PREFIX}screenplay`)
      localStorage.removeItem(`${DEFAULT_FONTS_KEY_PREFIX}novel`)
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Tool-wide default auto-parentheses setting (screenplay mode)
// ---------------------------------------------------------------------------

const DEFAULT_AUTO_PARENTHESES_KEY = 'openfolio.defaultAutoParentheses'

export function loadDefaultAutoParentheses(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true
    const raw = localStorage.getItem(DEFAULT_AUTO_PARENTHESES_KEY)
    return raw !== null ? JSON.parse(raw) === true : true
  } catch {
    return true
  }
}

export function saveDefaultAutoParentheses(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(DEFAULT_AUTO_PARENTHESES_KEY, JSON.stringify(enabled))
  } catch {
    /* ignore */
  }
}

export function resetDefaultAutoParentheses(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(DEFAULT_AUTO_PARENTHESES_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Tool-wide default auto-continued setting (screenplay mode)
// ---------------------------------------------------------------------------

const DEFAULT_AUTO_CONTINUED_KEY = 'openfolio.defaultAutoContinued'

export function loadDefaultAutoContinued(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true
    const raw = localStorage.getItem(DEFAULT_AUTO_CONTINUED_KEY)
    return raw !== null ? JSON.parse(raw) === true : true
  } catch {
    return true
  }
}

export function saveDefaultAutoContinued(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(DEFAULT_AUTO_CONTINUED_KEY, JSON.stringify(enabled))
  } catch {
    /* ignore */
  }
}

export function resetDefaultAutoContinued(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(DEFAULT_AUTO_CONTINUED_KEY)
  } catch {
    /* ignore */
  }
}


