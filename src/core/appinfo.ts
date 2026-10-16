import { isTauri } from './persistence'

export const APP_NAME = 'OpenFolio'
export const APP_AUTHOR = 'Francesco Flora'
export const APP_LICENSE = 'GPL-3.0-or-later'
declare const __APP_VERSION__: string | undefined

/** Mirrors package.json / tauri.conf.json versions, injected dynamically by Vite. */
export const APP_VERSION_FALLBACK = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'

/** Pagina GitHub del progetto. */
export const GITHUB_URL = 'https://github.com/francescoflora/openfolio'
/** Profilo LinkedIn dell'autore. */
export const LINKEDIN_URL = 'https://www.linkedin.com/in/francesco-flora-975885187/'

export async function getAppVersion(): Promise<string> {
  if (isTauri()) {
    try {
      const { getVersion } = await import('@tauri-apps/api/app')
      return await getVersion()
    } catch {
      /* fall through */
    }
  }
  return APP_VERSION_FALLBACK
}
