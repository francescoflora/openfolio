import { isTauri } from './persistence'

/** Opens an external URL in the system browser (Tauri) or a new tab (web). */
export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
      return
    } catch (e) {
      console.warn('openUrl failed, falling back to window.open', e)
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
