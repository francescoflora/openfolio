import { create } from 'zustand'
import type { Update } from '@tauri-apps/plugin-updater'
import { isTauri } from '@/core/persistence'

export type UpdateStatus = 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error'

interface UpdaterState {
  status: UpdateStatus
  /** New version offered by the endpoint, when available. */
  version: string | null
  /** Release notes for the available update. */
  notes: string | null
  /** Download progress percentage (0-100), or null when unknown. */
  progress: number | null
  error: string | null
  check: (silent?: boolean) => Promise<void>
  install: () => Promise<void>
}

/** Kept outside the store: the Tauri Update handle is not serializable. */
let pending: Update | null = null

/** Updater only runs in a packaged Tauri app, never in the browser or `tauri dev`. */
export function canAutoUpdate(): boolean {
  return isTauri() && import.meta.env.PROD
}

export const useUpdater = create<UpdaterState>((set, get) => ({
  status: 'idle',
  version: null,
  notes: null,
  progress: null,
  error: null,

  check: async (silent = false) => {
    if (!canAutoUpdate()) return
    const s = get().status
    if (s === 'checking' || s === 'downloading') return
    set({ status: 'checking', error: null })
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (update) {
        pending = update
        set({ status: 'available', version: update.version, notes: update.body ?? null })
      } else {
        pending = null
        set({ status: 'none', version: null, notes: null })
      }
    } catch (e) {
      pending = null
      // A failed automatic check must stay quiet; a manual one can surface the error.
      if (silent) set({ status: 'idle', error: null })
      else set({ status: 'error', error: String(e) })
    }
  },

  install: async () => {
    if (!pending) return
    set({ status: 'downloading', progress: 0, error: null })
    try {
      let downloaded = 0
      let total = 0
      await pending.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0
            set({ progress: total ? 0 : null })
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            set({ progress: total ? Math.round((downloaded / total) * 100) : null })
            break
          case 'Finished':
            set({ progress: 100 })
            break
        }
      })
      set({ status: 'ready' })
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (e) {
      set({ status: 'error', error: String(e) })
    }
  },
}))
