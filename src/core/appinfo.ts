import { isTauri } from './persistence'

export const APP_NAME = 'OpenFolio'
export const APP_AUTHOR = 'Francesco Flora'
export const APP_LICENSE = 'GPL-3.0-or-later'
/** Mirrors package.json / tauri.conf.json versions. */
export const APP_VERSION_FALLBACK = '0.1.0'

/** Placeholder — pagina GitHub del progetto (da definire). */
export const GITHUB_URL = 'https://github.com/francescoflora/openfolio'

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
