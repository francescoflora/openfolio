import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveDocument } from '@/core/fileio'
import { parseProjectFile } from '@/core/projectfile'
import type { SceneDoc } from '@/core/json'
import { useProject } from './useProject'

vi.mock('@/core/fileio', () => ({
  saveDocument: vi.fn(),
  resetDocumentTarget: vi.fn(),
  openTextFile: vi.fn(),
  readTextFromPath: vi.fn(),
}))

vi.mock('@/core/persistence', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/core/persistence')>(),
  addRecent: vi.fn(),
}))

const scene = (text: string): SceneDoc => ({
  type: 'doc',
  content: [{ type: 'action', content: [{ type: 'text', text }] }],
})

function suspendSave() {
  let resolve!: (result: { path: string | null } | null) => void
  const pending = new Promise<{ path: string | null } | null>((done) => { resolve = done })
  vi.mocked(saveDocument).mockReturnValueOnce(pending)
  return resolve
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useProject.getState().newProject('screenplay', 'Test')
  useProject.setState({ operation: null, toast: null })
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  useProject.getState().closeProject()
})

describe('project saving', () => {
  it('marks an unchanged project as saved and binds its path', async () => {
    vi.mocked(saveDocument).mockResolvedValueOnce({ path: 'C:/test.ofp' })

    await useProject.getState().save()

    expect(useProject.getState().dirty).toBe(false)
    expect(useProject.getState().filePath).toBe('C:/test.ofp')
    expect(useProject.getState().operation?.status).toBe('success')
  })

  it('keeps edits made during a save marked as unsaved', async () => {
    const complete = suspendSave()
    const sceneId = useProject.getState().selectedId!
    const original = scene('Original text')
    const edited = scene('New text typed while saving')
    useProject.getState().updateScene(sceneId, original)

    const saving = useProject.getState().save()
    expect(saveDocument).toHaveBeenCalledOnce()
    const written = parseProjectFile(vi.mocked(saveDocument).mock.calls[0]![0])
    expect(written.scenes[sceneId]).toEqual(original)
    useProject.getState().updateScene(sceneId, edited)
    complete({ path: 'C:/test.ofp' })
    await saving

    expect(useProject.getState().scenes[sceneId]).toEqual(edited)
    expect(useProject.getState().dirty).toBe(true)
    expect(useProject.getState().filePath).toBe('C:/test.ofp')
    expect(useProject.getState().operation?.subtitle).toBe('Modifiche non salvate')
  })

  it('keeps project metadata changed during a save marked as unsaved', async () => {
    const complete = suspendSave()
    const saving = useProject.getState().save()
    useProject.getState().setProjectTitle('Changed while saving')
    complete({ path: null })
    await saving

    expect(useProject.getState().dirty).toBe(true)
    expect(useProject.getState().project?.title).toBe('Changed while saving')
  })

  it('does not bind the saved file or clear changes on a newly opened project', async () => {
    const complete = suspendSave()
    const saving = useProject.getState().save()
    useProject.getState().newProject('novel', 'Another project')
    complete({ path: 'C:/old-project.ofp' })
    await saving

    expect(useProject.getState().project?.title).toBe('Another project')
    expect(useProject.getState().filePath).toBeNull()
    expect(useProject.getState().dirty).toBe(true)
    expect(useProject.getState().toast).toBeNull()
  })

  it('prevents simultaneous writes from repeated save commands', async () => {
    const complete = suspendSave()
    const saving = useProject.getState().save()
    await useProject.getState().save({ saveAs: true })
    expect(saveDocument).toHaveBeenCalledOnce()
    complete({ path: 'C:/test.ofp' })
    await saving

    vi.mocked(saveDocument).mockResolvedValueOnce({ path: 'C:/test.ofp' })
    await useProject.getState().save()
    expect(saveDocument).toHaveBeenCalledTimes(2)
  })

  it('allows saving again after cancellation', async () => {
    vi.mocked(saveDocument).mockResolvedValueOnce(null)
    await useProject.getState().save()
    expect(useProject.getState().dirty).toBe(true)
    expect(useProject.getState().operation).toBeNull()

    vi.mocked(saveDocument).mockResolvedValueOnce({ path: 'C:/test.ofp' })
    await useProject.getState().save()
    expect(useProject.getState().dirty).toBe(false)
  })

  it('preserves a newer export notification when saving finishes', async () => {
    const complete = suspendSave()
    const saving = useProject.getState().save()
    useProject.getState().startOperation('export', 'Export in progress')
    complete({ path: 'C:/test.ofp' })
    await saving

    expect(useProject.getState().dirty).toBe(false)
    expect(useProject.getState().operation?.type).toBe('export')
    expect(useProject.getState().operation?.status).toBe('busy')
  })

  it('allows retrying after a write failure and keeps the document dirty', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(saveDocument).mockRejectedValueOnce(new Error('Disk unavailable'))
      await useProject.getState().save()
      expect(useProject.getState().dirty).toBe(true)
      expect(useProject.getState().filePath).toBeNull()
      expect(useProject.getState().operation?.status).toBe('error')

      vi.mocked(saveDocument).mockResolvedValueOnce({ path: 'C:/test.ofp' })
      await useProject.getState().save()
      expect(useProject.getState().dirty).toBe(false)
    } finally {
      errorLog.mockRestore()
    }
  })
})
