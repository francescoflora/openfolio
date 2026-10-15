export interface JSONMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface JSONContent {
  type?: string
  attrs?: Record<string, unknown>
  content?: JSONContent[]
  marks?: JSONMark[]
  text?: string
}

export interface SceneDoc {
  type: 'doc'
  content: JSONContent[]
}

export function emptySceneDoc(firstType = 'action'): SceneDoc {
  return { type: 'doc', content: [{ type: firstType }] }
}
