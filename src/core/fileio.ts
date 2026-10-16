import { isTauri } from './persistence'

export interface SaveFilter {
  name: string
  extensions: string[]
}

export interface OpenedFile {
  name: string
  text: string
  /** Absolute path when running under Tauri (undefined in the browser). */
  path?: string
}

function browserDownload(filename: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function mimeForExt(ext: string): string {
  if (ext === 'ofp' || ext === 'openfolio' || ext === 'json') return 'application/json'
  if (ext === 'fdx') return 'application/xml'
  if (ext === 'md') return 'text/markdown'
  return 'text/plain'
}

// ---------------------------------------------------------------------------
// Browser File System Access API (optional) — lets us overwrite the same file
// ---------------------------------------------------------------------------

type FsFileHandle = {
  name: string
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
  getFile(): Promise<File>
}
type FsWindow = Window & {
  showOpenFilePicker?: (opts?: unknown) => Promise<FsFileHandle[]>
  showSaveFilePicker?: (opts?: unknown) => Promise<FsFileHandle>
}

let currentHandle: FsFileHandle | null = null

/** Forget the bound file (browser): next save asks for a location. */
export function resetDocumentTarget(): void {
  currentHandle = null
}

function pickerTypes(extensions: string[]) {
  const accept: Record<string, string[]> = {}
  for (const e of extensions) {
    const mime = mimeForExt(e)
    ;(accept[mime] ??= []).push(`.${e}`)
  }
  return [{ description: 'Documento', accept }]
}

async function writeHandle(handle: FsFileHandle, text: string): Promise<void> {
  const w = await handle.createWritable()
  await w.write(text)
  await w.close()
}

/** Pick and read a text file — native dialog under Tauri, File System Access API or `<input>` otherwise. */
export async function openTextFile(extensions: string[], filterName = 'Documento'): Promise<OpenedFile | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ multiple: false, filters: [{ name: filterName, extensions }] })
    if (!path || typeof path !== 'string') return null
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const name = path.split(/[\\/]/).pop() ?? 'import'
    return { name, text: await readTextFile(path), path }
  }

  const w = window as FsWindow
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({ multiple: false, types: pickerTypes(extensions) })
      if (!handle) return null
      currentHandle = handle
      return { name: handle.name, text: await (await handle.getFile()).text() }
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = extensions.map((e) => `.${e}`).join(',')
    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? { name: file.name, text: await file.text() } : null)
    }
    input.click()
  })
}

/**
 * Save export output to disk. Uses the native save dialog under Tauri and a
 * browser download otherwise. `data` may be text or raw bytes (zip/pdf).
 */
export async function saveExport(
  filename: string,
  data: string | Uint8Array,
  mime: string,
  filters?: SaveFilter[],
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({ defaultPath: filename, filters })
    if (!path) return false
    const fs = await import('@tauri-apps/plugin-fs')
    if (typeof data === 'string') await fs.writeTextFile(path, data)
    else await fs.writeFile(path, data)
    return true
  }
  browserDownload(filename, data, mime)
  return true
}

/** Read a text file by absolute path (Tauri only). */
export async function readTextFromPath(path: string): Promise<string> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  return readTextFile(path)
}

/**
 * Save the document to a single file.
 * - Tauri: overwrites `currentPath` unless `saveAs`; otherwise asks where to save.
 * - Browser: overwrites the bound file handle unless `saveAs`; otherwise asks
 *   (File System Access API) or downloads.
 * Returns `null` when the user cancels, else an object (`path` set on Tauri).
 */
export async function saveDocument(
  text: string,
  defaultName: string,
  filters: SaveFilter[],
  currentPath?: string | null,
  saveAs = false,
): Promise<{ path: string | null } | null> {
  if (isTauri()) {
    let path = !saveAs && currentPath ? currentPath : null
    if (!path) {
      const { save } = await import('@tauri-apps/plugin-dialog')
      path = (await save({ defaultPath: defaultName, filters })) ?? null
    }
    if (!path) return null
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, text)
    return { path }
  }

  const w = window as FsWindow
  if (!saveAs && currentHandle) {
    await writeHandle(currentHandle, text)
    return { path: null }
  }
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: defaultName,
        types: pickerTypes(filters[0]?.extensions ?? ['ofp', 'openfolio']),
      })
      currentHandle = handle
      await writeHandle(handle, text)
      return { path: null }
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null
      throw e
    }
  }
  browserDownload(defaultName, text, mimeForExt(filters[0]?.extensions?.[0] ?? 'txt'))
  return { path: null }
}
