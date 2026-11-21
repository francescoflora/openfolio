import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openTextFile, resetDocumentTarget, saveDocument } from './fileio'
import { parseProjectFile } from './projectfile'

const filters = [{ name: 'OpenFolio', extensions: ['ofp'] }]

function fileHandle(name: string, text = 'document') {
  const writable = {
    write: vi.fn(async (_text: string) => {}),
    close: vi.fn(async () => {}),
  }
  return {
    name,
    getFile: vi.fn(async () => ({ text: async () => text })),
    createWritable: vi.fn(async () => writable),
    writable,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => { resolve = finish })
  return { promise, resolve }
}

describe('browser document targets', () => {
  let openPicker: ReturnType<typeof vi.fn>
  let savePicker: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetDocumentTarget()
    openPicker = vi.fn()
    savePicker = vi.fn()
    vi.stubGlobal('window', {
      showOpenFilePicker: openPicker,
      showSaveFilePicker: savePicker,
    })
  })

  afterEach(() => {
    resetDocumentTarget()
    vi.unstubAllGlobals()
  })

  it('preserves the current target when opening another project fails validation', async () => {
    const original = fileHandle('original.ofp')
    const invalid = fileHandle('invalid.ofp', '{"invalid":true}')
    openPicker.mockResolvedValueOnce([original]).mockResolvedValueOnce([invalid])

    const first = await openTextFile(['ofp'])
    first?.acceptDocumentTarget?.()
    const failed = await openTextFile(['ofp'])
    expect(() => parseProjectFile(failed!.text)).toThrow()

    await saveDocument('updated original', 'original.ofp', filters)
    expect(original.writable.write).toHaveBeenCalledWith('updated original')
    expect(invalid.createWritable).not.toHaveBeenCalled()
    expect(savePicker).not.toHaveBeenCalled()
  })

  it('replaces the target only when an opened document is accepted', async () => {
    const original = fileHandle('original.ofp')
    const next = fileHandle('next.ofp')
    openPicker.mockResolvedValueOnce([original]).mockResolvedValueOnce([next])
    ;(await openTextFile(['ofp']))?.acceptDocumentTarget?.()
    ;(await openTextFile(['ofp']))?.acceptDocumentTarget?.()

    await saveDocument('updated next', 'next.ofp', filters)
    expect(next.writable.write).toHaveBeenCalledWith('updated next')
    expect(original.createWritable).not.toHaveBeenCalled()
  })

  it('does not bind an import source as the new project target', async () => {
    const imported = fileHandle('source.fdx')
    const project = fileHandle('new.ofp')
    openPicker.mockResolvedValueOnce([imported])
    savePicker.mockResolvedValueOnce(project)
    await openTextFile(['fdx'])
    resetDocumentTarget()

    await saveDocument('project data', 'new.ofp', filters)
    expect(savePicker).toHaveBeenCalledOnce()
    expect(project.writable.write).toHaveBeenCalledWith('project data')
    expect(imported.createWritable).not.toHaveBeenCalled()
  })

  it('preserves the old target when Save As fails to write', async () => {
    const original = fileHandle('original.ofp')
    const failed = fileHandle('failed.ofp')
    failed.writable.write.mockRejectedValueOnce(new Error('Write failed'))
    openPicker.mockResolvedValueOnce([original])
    savePicker.mockResolvedValueOnce(failed)
    ;(await openTextFile(['ofp']))?.acceptDocumentTarget?.()

    await expect(saveDocument('copy', 'failed.ofp', filters, null, true)).rejects.toThrow('Write failed')
    await saveDocument('original update', 'original.ofp', filters)
    expect(original.writable.write).toHaveBeenCalledWith('original update')
    expect(savePicker).toHaveBeenCalledOnce()
  })

  it('does not restore the old target when a save dialog finishes after a project reset', async () => {
    const stale = fileHandle('old.ofp')
    const fresh = fileHandle('new.ofp')
    const picker = deferred<ReturnType<typeof fileHandle>>()
    savePicker.mockReturnValueOnce(picker.promise).mockResolvedValueOnce(fresh)

    const pending = saveDocument('old project', 'old.ofp', filters)
    resetDocumentTarget()
    picker.resolve(stale)
    await pending
    await saveDocument('new project', 'new.ofp', filters)

    expect(savePicker).toHaveBeenCalledTimes(2)
    expect(fresh.writable.write).toHaveBeenCalledWith('new project')
    expect(stale.writable.write).toHaveBeenCalledExactlyOnceWith('old project')
  })

  it('does not restore the old target when a disk write finishes after a project reset', async () => {
    const stale = fileHandle('old.ofp')
    const fresh = fileHandle('new.ofp')
    const started = deferred<void>()
    const write = deferred<void>()
    stale.writable.write.mockImplementationOnce(async () => {
      started.resolve()
      await write.promise
    })
    savePicker.mockResolvedValueOnce(stale).mockResolvedValueOnce(fresh)

    const pending = saveDocument('old project', 'old.ofp', filters)
    await started.promise
    resetDocumentTarget()
    write.resolve()
    await pending
    await saveDocument('new project', 'new.ofp', filters)

    expect(savePicker).toHaveBeenCalledTimes(2)
    expect(fresh.writable.write).toHaveBeenCalledWith('new project')
    expect(stale.writable.write).toHaveBeenCalledExactlyOnceWith('old project')
  })

  it('keeps a newly opened target when an earlier save dialog completes', async () => {
    const stale = fileHandle('old.ofp')
    const opened = fileHandle('opened.ofp')
    const picker = deferred<ReturnType<typeof fileHandle>>()
    savePicker.mockReturnValueOnce(picker.promise)
    openPicker.mockResolvedValueOnce([opened])

    const pending = saveDocument('old project', 'old.ofp', filters)
    ;(await openTextFile(['ofp']))?.acceptDocumentTarget?.()
    picker.resolve(stale)
    await pending
    await saveDocument('opened update', 'opened.ofp', filters)

    expect(opened.writable.write).toHaveBeenCalledWith('opened update')
    expect(stale.writable.write).toHaveBeenCalledExactlyOnceWith('old project')
    expect(savePicker).toHaveBeenCalledOnce()
  })

  it('clears the old handle when accepting a project opened through an input', async () => {
    const original = fileHandle('original.ofp')
    const fresh = fileHandle('fallback.ofp')
    openPicker.mockResolvedValueOnce([original]).mockRejectedValueOnce(new Error('Picker unavailable'))
    savePicker.mockResolvedValueOnce(fresh)
    ;(await openTextFile(['ofp']))?.acceptDocumentTarget?.()

    const input = {
      files: [{ name: 'fallback.ofp', text: async () => 'fallback document' }],
      onchange: null as null | (() => Promise<void>),
      click: () => { void input.onchange?.() },
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => input) })
    const fallback = await openTextFile(['ofp'])
    expect(fallback?.text).toBe('fallback document')
    fallback?.acceptDocumentTarget?.()
    await saveDocument('fallback update', 'fallback.ofp', filters)

    expect(savePicker).toHaveBeenCalledOnce()
    expect(fresh.writable.write).toHaveBeenCalledWith('fallback update')
    expect(original.createWritable).not.toHaveBeenCalled()
  })
})
