import { isTauri } from './persistence'
import type { SceneDoc } from './json'
import { serializeScene, parseFountainScenes } from './fountain'
import { serializeFdx, parseFdx } from './fdx'

export async function nativeExportFountain(scenes: SceneDoc[]): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<string>('export_fountain', { scenes })
    } catch (e) {
      console.warn('Native export_fountain failed, falling back to JS:', e)
    }
  }
  return scenes.map((s) => serializeScene(s)).join('\n')
}

export async function nativeImportFountain(text: string): Promise<SceneDoc[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<SceneDoc[]>('import_fountain', { text })
    } catch (e) {
      console.warn('Native import_fountain failed, falling back to JS:', e)
    }
  }
  return parseFountainScenes(text)
}

export async function nativeExportFdx(scenes: SceneDoc[]): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<string>('export_fdx', { scenes })
    } catch (e) {
      console.warn('Native export_fdx failed, falling back to JS:', e)
    }
  }
  return serializeFdx(scenes)
}

export async function nativeImportFdx(xml: string): Promise<SceneDoc[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<SceneDoc[]>('import_fdx', { xml })
    } catch (e) {
      console.warn('Native import_fdx failed, falling back to JS:', e)
    }
  }
  return parseFdx(xml)
}

export interface NativePdfPayload {
  title: string
  mode: string
  author?: string
  contact?: string
  font_family?: string
  font_size_pt?: number
  justify?: boolean
  indent?: boolean
  has_title_page?: boolean
  page_size?: string
  scenes: SceneDoc[]
}

export async function nativeExportPdf(payload: NativePdfPayload): Promise<Uint8Array | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const bytes = await invoke<number[]>('export_pdf', { payload })
      return new Uint8Array(bytes)
    } catch (e) {
      console.warn('Native export_pdf failed, falling back:', e)
    }
  }
  return null
}
