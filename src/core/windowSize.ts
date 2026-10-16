import { isTauri } from './persistence'

export const START_WINDOW_WIDTH = 640
export const START_WINDOW_HEIGHT = 400
export const START_WINDOW_HEIGHT_WITH_RECENTS = 400
export const START_WINDOW_HEIGHT_NO_RECENTS = 400

export const START_MIN_WIDTH = 640
export const START_MIN_HEIGHT = 400

export const APP_MIN_WIDTH = 760
export const APP_MIN_HEIGHT = 500

/**
 * Calcola le dimensioni per la finestra iniziale (StartScreen),
 * identiche a quelle della splash screen (640x400).
 */
export function getStartWindowSize(): { width: number; height: number } {
  return {
    width: START_WINDOW_WIDTH,
    height: START_WINDOW_HEIGHT,
  }
}

/**
 * Calcola le dimensioni standard per la finestra principale dell'editor.
 */
export function getDefaultAppSize(): { width: number; height: number } {
  const availW = typeof window !== 'undefined' && window.screen ? window.screen.availWidth || 1280 : 1280
  const availH = typeof window !== 'undefined' && window.screen ? window.screen.availHeight || 800 : 800
  const targetW = Math.min(1360, Math.max(960, Math.round(availW * 0.88)))
  const targetH = Math.min(860, Math.max(620, Math.round(availH * 0.90)))
  return { width: targetW, height: targetH }
}

/**
 * Riduce la finestra alle dimensioni compatte della schermata iniziale.
 */
export async function applyStartWindowSize(): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const { LogicalSize } = await import('@tauri-apps/api/dpi')
    const win = getCurrentWindow()

    const isMax = await win.isMaximized().catch(() => false)
    if (isMax) {
      await win.unmaximize().catch(() => {})
    }

    const { width, height } = getStartWindowSize()
    await win.setMinSize(new LogicalSize(START_MIN_WIDTH, START_MIN_HEIGHT))

    // Se la finestra è già alle dimensioni compatte e non è massimizzata, evita setSize e center
    // che su Windows causano un micro-scatto per ricalcolo delle coordinate non-client
    const inner = await win.innerSize().catch(() => null)
    const factor = await win.scaleFactor().catch(() => 1)
    if (inner && !isMax) {
      const curW = Math.round(inner.width / factor)
      const curH = Math.round(inner.height / factor)
      if (Math.abs(curW - width) <= 2 && Math.abs(curH - height) <= 2) {
        return
      }
    }

    await win.setSize(new LogicalSize(width, height))
    await win.center()
  } catch (err) {
    console.warn('Failed to resize to start window', err)
  }
}

/**
 * Espande la finestra alle dimensioni standard per l'area di lavoro completa.
 */
export async function applyDefaultAppSize(): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const { LogicalSize } = await import('@tauri-apps/api/dpi')
    const win = getCurrentWindow()

    const { width, height } = getDefaultAppSize()
    await win.setMinSize(new LogicalSize(APP_MIN_WIDTH, APP_MIN_HEIGHT))
    await win.setSize(new LogicalSize(width, height))
    await win.center()
  } catch (err) {
    console.warn('Failed to resize to default app window', err)
  }
}

/**
 * Alterna lo stato massimizzato/ripristinato della finestra.
 */
export async function toggleWindowMaximize(): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const max = await win.isMaximized().catch(() => false)
    if (max) {
      await win.unmaximize()
    } else {
      await win.maximize()
    }
  } catch (err) {
    console.warn('Failed to toggle window maximize', err)
  }
}

