export type ProjectMode = 'screenplay' | 'novel'

export type Language = 'it' | 'en'

export type NodeKind = 'folder' | 'scene'

export type SceneStatus = 'idea' | 'outline' | 'draft' | 'revised' | 'final'

export interface NodeMetadata {
  synopsis?: string
  status?: SceneStatus
  label?: string
  note?: string
  wordCount?: number
  charCount?: number
  target?: number
}

export interface Snapshot {
  id: string
  at: string
  label: string
  words: number
  doc: unknown
}

export interface BinderNode {
  id: string
  title: string
  kind: NodeKind
  children?: BinderNode[]
  metadata: NodeMetadata
}

export interface TitlePage {
  title?: string
  author?: string
  contact?: string
}

export interface ProjectSettings {
  fontFamily: string
  fontSizePt: number
  author: string
  wordGoal?: number
  template?: string
  titlePage?: TitlePage
  /** UI + spell-check language. Defaults to Italian. */
  language?: Language
  /** Browser spell checker on the editor. Defaults to true. */
  spellcheck?: boolean
  /** Justify novel paragraphs. Defaults to true in novel mode. */
  justify?: boolean
  /** Indent first line of novel paragraphs. Defaults to true in novel mode. */
  indent?: boolean
  /** Default page zoom percentage (50-200). */
  zoom?: number
  /** Custom font family per element/line type (e.g. action, character, dialogue, heading, paragraph). */
  elementFonts?: Record<string, string>
  /** Auto-enclosing parentheses for parenthetical element. Defaults to true. */
  autoParentheses?: boolean
}

export const DEFAULT_LANGUAGE: Language = 'it'

export interface Project {
  id: string
  version: number
  title: string
  mode: ProjectMode
  author: string
  binder: BinderNode[]
  snapshots: Record<string, Snapshot[]>
  settings: ProjectSettings
  createdAt: string
  modifiedAt: string
}

export const SCENE_STATUSES: SceneStatus[] = ['idea', 'outline', 'draft', 'revised', 'final']

export const PROJECT_VERSION = 1
