import type { Project } from './types'
import type { SceneDoc } from './json'

export interface ProjectFile {
  app: 'openfolio'
  version: number
  project: Project
  scenes: Record<string, SceneDoc>
}

export const PROJECT_FILE_VERSION = 1
/** Estensione predefinita per i file di progetto OpenFolio (OpenFolio Project) */
export const PROJECT_EXTENSION = 'ofp'
/** Estensione legacy per garantire la retrocompatibilità con i progetti salvati in precedenza */
export const LEGACY_PROJECT_EXTENSION = 'openfolio'
/** Tutte le estensioni di progetto supportate dall'applicazione */
export const SUPPORTED_PROJECT_EXTENSIONS = [PROJECT_EXTENSION, LEGACY_PROJECT_EXTENSION]

/** Serialize the whole project (binder + scenes + settings) into one file. */
export function serializeProjectFile(project: Project, scenes: Record<string, SceneDoc>): string {
  const file: ProjectFile = { app: 'openfolio', version: PROJECT_FILE_VERSION, project, scenes }
  return JSON.stringify(file, null, 2)
}

export function parseProjectFile(text: string): { project: Project; scenes: Record<string, SceneDoc> } {
  const parsed = JSON.parse(text) as Partial<ProjectFile> | null
  if (!parsed || typeof parsed !== 'object' || !parsed.project) {
    throw new Error('File di progetto non valido')
  }
  return { project: parsed.project, scenes: parsed.scenes ?? {} }
}
