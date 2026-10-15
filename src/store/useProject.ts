import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { BinderNode, Language, NodeMetadata, Project, ProjectMode, ProjectSettings, Snapshot } from '@/core/types'
import { PROJECT_VERSION } from '@/core/types'
import { normalizeLanguage, uiText } from '@/core/i18n'
import type { SceneDoc } from '@/core/json'
import { emptySceneDoc } from '@/core/json'
import { findNode, insertNode, moveNode, removeNode, sceneIds, updateNode } from '@/core/tree'
import type { DropPosition } from '@/core/tree'
import {
  addRecent,
  loadDefaultAutoParentheses,
  loadDefaultElementFonts,
  loadDefaultLanguage,
  loadLastView,
  removeRecent,
  saveDefaultLanguage,
  saveLastView,
} from '@/core/persistence'
import { openTextFile, readTextFromPath, resetDocumentTarget, saveDocument } from '@/core/fileio'
import { parseProjectFile, serializeProjectFile, PROJECT_EXTENSION } from '@/core/projectfile'
import { nativeImportFdx, nativeImportFountain } from '@/core/native'
import { countChars, countWords, slug, textOf } from '@/core/stats'

export type Theme = 'light' | 'dark'
export type ViewMode = 'editor' | 'corkboard' | 'outline'

function makeScene(title: string, wordCount = 0, charCount = 0): BinderNode {
  return { id: nanoid(), title, kind: 'scene', metadata: { status: 'draft', wordCount, charCount } }
}

function makeFolder(title: string): BinderNode {
  return { id: nanoid(), title, kind: 'folder', children: [], metadata: {} }
}

export function defaultScene(mode: ProjectMode, lang: Language = 'it'): SceneDoc {
  if (mode === 'novel') {
    return {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: lang === 'en' ? 'CHAPTER 1' : 'CAPITOLO 1' }],
        },
        {
          type: 'paragraph',
        },
      ],
    }
  }
  return emptySceneDoc('scene_heading')
}

export function newProject(
  mode: ProjectMode,
  title?: string,
  opts: Partial<ProjectSettings> = {},
): { project: Project; scenes: Record<string, SceneDoc> } {
  const isNovel = mode === 'novel'
  const lang = normalizeLanguage(opts.language ?? loadDefaultLanguage())
  const resolvedTitle = title ?? (lang === 'en' ? 'Untitled' : 'Senza titolo')
  const firstDoc = defaultScene(mode, lang)
  const first = makeScene(
    isNovel ? (lang === 'en' ? 'Chapter 1' : 'Capitolo 1') : (lang === 'en' ? 'Scene 1' : 'Scena 1'),
    countWords(firstDoc),
    countChars(firstDoc),
  )
  const folder = makeFolder(
    isNovel ? (lang === 'en' ? 'Part One' : 'Parte prima') : (lang === 'en' ? 'New Section' : 'Nuova sezione'),
  )
  folder.children = [first]
  const binder = [folder]
  const now = new Date().toISOString()
  const project: Project = {
    id: nanoid(),
    version: PROJECT_VERSION,
    title: resolvedTitle,
    mode,
    author: '',
    binder,
    snapshots: {},
    settings: {
      fontFamily: isNovel ? 'Georgia' : 'Courier Prime',
      fontSizePt: 12,
      author: '',
      language: lang,
      spellcheck: true,
      justify: isNovel,
      indent: isNovel,
      zoom: initialZoom(),
      elementFonts: loadDefaultElementFonts(mode),
      autoParentheses: opts.autoParentheses ?? (mode === 'screenplay' ? loadDefaultAutoParentheses() : true),
      ...opts,
    },
    createdAt: now,
    modifiedAt: now,
  }
  return { project, scenes: { [first.id]: firstDoc } }
}

/** Fills in settings added after a project was first saved. */
function normalizeProject(project: Project): Project {
  const isNovel = project.mode === 'novel'
  return {
    ...project,
    snapshots: project.snapshots ?? {},
    settings: {
      ...project.settings,
      language: normalizeLanguage(project.settings?.language),
      spellcheck: project.settings?.spellcheck ?? true,
      justify: project.settings?.justify ?? isNovel,
      indent: project.settings?.indent ?? isNovel,
      zoom: project.settings?.zoom ?? initialZoom(),
      elementFonts: project.settings?.elementFonts ?? {},
      autoParentheses: project.settings?.autoParentheses ?? true,
    },
  }
}

/** Build a screenplay or novel project from imported scenes (FDX, Fountain, Text, etc.). */
export function projectFromScenes(
  title: string,
  docs: SceneDoc[],
  mode: ProjectMode = 'screenplay',
): { project: Project; scenes: Record<string, SceneDoc> } {
  const p = newProject(mode, title)
  const lang = normalizeLanguage(p.project.settings.language)
  const scenes: Record<string, SceneDoc> = {}
  const binder: BinderNode[] = []
  docs.forEach((doc, i) => {
    const first = doc.content[0]
    const headingText =
      first && (first.type === 'scene_heading' || first.type === 'heading') ? textOf(first, ' ').trim() : ''
    const defaultLabel =
      headingText ||
      (mode === 'novel'
        ? docs.length > 1
          ? `${lang === 'en' ? 'Chapter' : 'Capitolo'} ${i + 1}`
          : title
        : docs.length > 1
          ? `${lang === 'en' ? 'Scene' : 'Scena'} ${i + 1}`
          : title)
    const node = makeScene(defaultLabel, countWords(doc), countChars(doc))
    scenes[node.id] = doc
    binder.push(node)
  })
  return { project: { ...p.project, binder }, scenes }
}

/** Last worked scene of a project, else its first scene. */
function pickScene(project: Project, scenes: Record<string, SceneDoc>): string | null {
  const last = loadLastView(project.id)
  if (last && findNode(project.binder, last.sceneId) && scenes[last.sceneId]) return last.sceneId
  return sceneIds(project.binder).find((id) => scenes[id]) ?? null
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('openfolio.theme', theme)
  }
}

function initialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light'
  const saved = (localStorage.getItem('openfolio.theme') ?? localStorage.getItem('scriptforge.theme')) as Theme | null
  if (saved) return saved
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialZoom(): number {
  if (typeof localStorage === 'undefined') return 100
  const saved = localStorage.getItem('scriptforge.zoom')
  if (saved) {
    const val = Number(saved)
    if (!isNaN(val) && val >= 50 && val <= 200) return val
  }
  return 100
}

interface State {
  project: Project | null
  scenes: Record<string, SceneDoc>
  filePath: string | null
  selectedId: string | null
  theme: Theme
  language: Language
  view: ViewMode
  revisionActive: boolean
  currentElement: string | null
  dirty: boolean
  inspectorOpen: boolean
  zoom: number
  toast: { id: number; message: string } | null
  setTheme: (t: Theme) => void
  setLanguage: (lang: Language) => void
  setView: (v: ViewMode) => void
  toggleRevision: () => void
  toggleInspector: () => void
  setZoom: (zoom: number) => void
  setCurrentElement: (t: string | null) => void
  showToast: (message: string) => void
  newProject: (mode: ProjectMode, title?: string, opts?: Partial<ProjectSettings>) => void
  importScenes: (title: string, docs: SceneDoc[], mode?: ProjectMode) => void
  openProject: () => Promise<void>
  importProject: (format?: 'fountain' | 'fdx' | 'txt') => Promise<void>
  openRecentProject: (path: string) => Promise<void>
  closeProject: () => void
  save: (opts?: { saveAs?: boolean }) => Promise<void>
  select: (id: string) => void
  updateScene: (id: string, doc: SceneDoc) => void
  updateMeta: (id: string, patch: Partial<NodeMetadata>) => void
  updateSettings: (patch: Partial<ProjectSettings>) => void
  addFolder: (parentId: string | null) => void
  addScene: (parentId: string | null) => void
  moveNode: (dragId: string, targetId: string, position: DropPosition) => void
  rename: (id: string, title: string) => void
  remove: (id: string) => void
  setProjectTitle: (title: string) => void
  addSnapshot: (id: string) => void
  restoreSnapshot: (id: string, snapId: string) => void
  deleteSnapshot: (id: string, snapId: string) => void
}

export const useProject = create<State>((set, get) => ({
  project: null,
  scenes: {},
  filePath: null,
  selectedId: null,
  theme: initialTheme(),
  language: loadDefaultLanguage(),
  view: 'editor',
  revisionActive: false,
  currentElement: null,
  dirty: false,
  inspectorOpen: false,
  zoom: initialZoom(),
  toast: null,

  showToast: (message) => {
    const id = Date.now()
    set({ toast: { id, message } })
    window.setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2500)
  },

  setTheme: (t) => {
    applyTheme(t)
    set({ theme: t })
  },

  setLanguage: (lang) => {
    const normalized = normalizeLanguage(lang)
    saveDefaultLanguage(normalized)
    set((s) => ({
      language: normalized,
      project: s.project
        ? { ...s.project, settings: { ...s.project.settings, language: normalized } }
        : null,
      dirty: s.project ? true : s.dirty,
    }))
  },

  setView: (v) => set({ view: v }),

  toggleRevision: () => set((s) => ({ revisionActive: !s.revisionActive })),

  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  setZoom: (z) => {
    const clamped = Math.min(200, Math.max(50, Math.round(z)))
    localStorage.setItem('scriptforge.zoom', String(clamped))
    set((s) => ({
      zoom: clamped,
      project: s.project
        ? {
            ...s.project,
            settings: {
              ...s.project.settings,
              zoom: clamped,
            },
          }
        : null,
    }))
  },

  setCurrentElement: (t) => {
    if (get().currentElement !== t) set({ currentElement: t })
  },

  newProject: (mode, title, opts) => {
    const p = newProject(mode, title, { language: get().language, ...opts })
    resetDocumentTarget()
    set({
      project: p.project,
      scenes: p.scenes,
      filePath: null,
      selectedId: sceneIds(p.project.binder)[0] ?? null,
      view: 'editor',
      dirty: true,
      zoom: p.project.settings.zoom ?? get().zoom ?? initialZoom(),
    })
  },

  importScenes: (title, docs, mode) => {
    const targetMode = mode ?? get().project?.mode ?? 'screenplay'
    const p = projectFromScenes(title, docs, targetMode)
    resetDocumentTarget()
    set({
      project: p.project,
      scenes: p.scenes,
      filePath: null,
      selectedId: sceneIds(p.project.binder)[0] ?? null,
      view: 'editor',
      dirty: true,
    })
  },

  openProject: async () => {
    const file = await openTextFile([PROJECT_EXTENSION, 'scriptforge', 'json'])
    if (!file) return
    try {
      const { project, scenes } = parseProjectFile(file.text)
      const p = normalizeProject(project)
      set({
        project: p,
        scenes,
        selectedId: pickScene(p, scenes),
        filePath: file.path ?? null,
        dirty: false,
        view: 'editor',
        language: normalizeLanguage(p.settings.language),
        zoom: p.settings.zoom ?? get().zoom ?? initialZoom(),
      })
      if (file.path) addRecent(file.path, p.title, p.mode)
    } catch (e) {
      console.error('Apertura non riuscita', e)
    }
  },

  importProject: async (format) => {
    const exts = format ? [format] : ['fountain', 'fdx', 'txt']
    const file = await openTextFile(exts)
    if (!file) return
    const title = file.name.replace(/\.[^.]+$/, '')
    const isFdx = format === 'fdx' || file.name.toLowerCase().endsWith('.fdx')
    const isFountain = format === 'fountain' || file.name.toLowerCase().endsWith('.fountain')

    if (isFdx) {
      const docs = await nativeImportFdx(file.text)
      get().importScenes(title, docs, 'screenplay')
    } else if (isFountain) {
      const docs = await nativeImportFountain(file.text)
      get().importScenes(title, docs, 'screenplay')
    } else {
      const isNovel = get().project?.mode === 'novel'
      if (isNovel) {
        const paragraphs = file.text.replace(/\r\n/g, '\n').split(/\n\s*\n/)
        const content = paragraphs
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => {
            if (p.startsWith('# ') || /^capitolo\s+\d+/i.test(p) || /^chapter\s+\d+/i.test(p)) {
              return {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: p.replace(/^#+\s*/, '') }],
              }
            }
            return {
              type: 'paragraph',
              content: [{ type: 'text', text: p }],
            }
          })
        const doc: SceneDoc = { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
        get().importScenes(title, [doc], 'novel')
      } else {
        const docs = await nativeImportFountain(file.text)
        get().importScenes(title, docs, 'screenplay')
      }
    }
  },

  openRecentProject: async (path) => {
    try {
      const text = await readTextFromPath(path)
      const { project, scenes } = parseProjectFile(text)
      const p = normalizeProject(project)
      set({
        project: p,
        scenes,
        selectedId: pickScene(p, scenes),
        filePath: path,
        dirty: false,
        view: 'editor',
        language: normalizeLanguage(p.settings.language),
        zoom: p.settings.zoom ?? get().zoom ?? initialZoom(),
      })
      addRecent(path, p.title, p.mode)
    } catch {
      removeRecent(path)
    }
  },

  closeProject: () => {
    resetDocumentTarget()
    set({
      project: null,
      scenes: {},
      filePath: null,
      selectedId: null,
      dirty: false,
      revisionActive: false,
      currentElement: null,
      inspectorOpen: false,
      view: 'editor',
    })
  },

  save: async (opts) => {
    const { project, scenes, filePath, language } = get()
    if (!project) return
    const t = uiText(project.settings.language ?? language)
    try {
      const text = serializeProjectFile(project, scenes)
      const name = `${slug(project.title)}.${PROJECT_EXTENSION}`
      const res = await saveDocument(
        text,
        name,
        [{ name: 'OpenFolio', extensions: [PROJECT_EXTENSION] }],
        filePath,
        opts?.saveAs,
      )
      if (!res) return
      if (res.path) {
        addRecent(res.path, project.title, project.mode)
        set({ filePath: res.path, dirty: false })
      } else {
        set({ dirty: false })
      }
      get().showToast(t.toastSaved)
    } catch (e) {
      console.error('Salvataggio non riuscito', e)
      get().showToast(t.toastSaveError)
    }
  },

  select: (id) => {
    const project = get().project
    if (project && get().selectedId !== id) saveLastView(project.id, { sceneId: id, scrollTop: 0 })
    set({ selectedId: id })
  },

  updateScene: (id, doc) => {
    const project = get().project
    if (!project) return
    const words = countWords(doc)
    const chars = countChars(doc)
    const curMeta = findNode(project.binder, id)?.metadata
    const metaChanged = curMeta?.wordCount !== words || curMeta?.charCount !== chars
    set((s) => ({
      scenes: { ...s.scenes, [id]: doc },
      dirty: true,
      project: metaChanged
        ? { ...project, binder: updateNode(project.binder, id, { metadata: { ...curMeta, wordCount: words, charCount: chars } }) }
        : project,
    }))
  },

  addFolder: (parentId) => {
    const project = get().project
    if (!project) return
    const lang = normalizeLanguage(project.settings.language ?? get().language)
    const node = makeFolder(lang === 'en' ? 'New Section' : 'Nuova sezione')
    set({ project: { ...project, binder: insertNode(project.binder, parentId, node) }, selectedId: node.id, dirty: true })
  },

  addScene: (parentId) => {
    const project = get().project
    if (!project) return
    const isNovel = project.mode === 'novel'
    const lang = normalizeLanguage(project.settings.language ?? get().language)
    const chapterNum = isNovel ? sceneIds(project.binder).length + 1 : undefined
    const title = isNovel
      ? `${lang === 'en' ? 'Chapter' : 'Capitolo'} ${chapterNum}`
      : lang === 'en'
        ? 'New scene'
        : 'Nuova scena'
    const initialDoc: SceneDoc = isNovel
      ? {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: `${lang === 'en' ? 'CHAPTER' : 'CAPITOLO'} ${chapterNum}` }],
            },
            {
              type: 'paragraph',
            },
          ],
        }
      : defaultScene(project.mode, lang)
    const node = makeScene(title, countWords(initialDoc), countChars(initialDoc))

    set((s) => ({
      project: { ...project, binder: insertNode(project.binder, parentId, node) },
      scenes: { ...s.scenes, [node.id]: initialDoc },
      selectedId: node.id,
      dirty: true,
    }))
  },

  rename: (id, title) => {
    const project = get().project
    if (!project) return
    set({ project: { ...project, binder: updateNode(project.binder, id, { title }) }, dirty: true })
  },

  moveNode: (dragId, targetId, position) => {
    const project = get().project
    if (!project) return
    const binder = moveNode(project.binder, dragId, targetId, position)
    if (binder === project.binder) return
    set({ project: { ...project, binder }, dirty: true })
  },

  updateMeta: (id, patch) => {
    const project = get().project
    if (!project) return
    const current = findNode(project.binder, id)?.metadata ?? {}
    set({ project: { ...project, binder: updateNode(project.binder, id, { metadata: { ...current, ...patch } }) }, dirty: true })
  },

  updateSettings: (patch) => {
    const project = get().project
    if (!project) return
    if (patch.language) saveDefaultLanguage(patch.language)
    set((s) => ({
      language: patch.language ? normalizeLanguage(patch.language) : s.language,
      project: { ...project, settings: { ...project.settings, ...patch } },
      dirty: true,
    }))
  },

  addSnapshot: (id) => {
    const project = get().project
    const doc = get().scenes[id]
    if (!project || !doc) return
    const lang = normalizeLanguage(project.settings.language ?? get().language)
    const snap: Snapshot = {
      id: nanoid(),
      at: new Date().toISOString(),
      label: new Date().toLocaleString(lang === 'en' ? 'en-US' : 'it-IT'),
      words: countWords(doc),
      doc,
    }
    const list = project.snapshots[id] ?? []
    set({ project: { ...project, snapshots: { ...project.snapshots, [id]: [snap, ...list].slice(0, 25) } }, dirty: true })
  },

  restoreSnapshot: (id, snapId) => {
    const project = get().project
    if (!project) return
    const snap = (project.snapshots[id] ?? []).find((s) => s.id === snapId)
    if (!snap) return
    const doc = snap.doc as SceneDoc
    set((s) => ({
      scenes: { ...s.scenes, [id]: doc },
      project: {
        ...project,
        binder: updateNode(project.binder, id, {
          metadata: { ...findNode(project.binder, id)?.metadata, wordCount: snap.words, charCount: countChars(doc) },
        }),
      },
      dirty: true,
    }))
  },

  deleteSnapshot: (id, snapId) => {
    const project = get().project
    if (!project) return
    set({
      project: { ...project, snapshots: { ...project.snapshots, [id]: (project.snapshots[id] ?? []).filter((s) => s.id !== snapId) } },
      dirty: true,
    })
  },

  remove: (id) => {
    const project = get().project
    if (!project) return
    const node = findNode(project.binder, id)
    if (!node) return
    const ids = new Set(sceneIds([node]))
    const scenes = { ...get().scenes }
    ids.forEach((sid) => delete scenes[sid])
    set((s) => ({
      project: { ...project, binder: removeNode(project.binder, id) },
      scenes,
      selectedId: s.selectedId && ids.has(s.selectedId) ? null : s.selectedId,
      dirty: true,
    }))
  },

  setProjectTitle: (title) => {
    const project = get().project
    if (!project) return
    set({ project: { ...project, title }, dirty: true })
  },
}))
