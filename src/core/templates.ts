import { BookOpen, Clapperboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ProjectMode, ProjectSettings } from './types'

export interface Template {
  id: string
  name: string
  mode: ProjectMode
  icon: LucideIcon
  fontFamily: string
  fontSizePt: number
  wordGoal?: number
  description: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'screenplay',
    name: 'Sceneggiatura',
    mode: 'screenplay',
    icon: Clapperboard,
    fontFamily: 'Courier Prime',
    fontSizePt: 12,
    description: 'Sceneggiatura standard per cinema, serie TV e cortometraggi.',
  },
  {
    id: 'novel',
    name: 'Romanzo',
    mode: 'novel',
    icon: BookOpen,
    fontFamily: 'Times New Roman',
    fontSizePt: 12,
    wordGoal: 80000,
    description: 'Manoscritto in prosa organizzato per capitoli e scene con tracciamento parole.',
  },
]

/** Project settings seeded by a template when creating a new project. */
export function templateOpts(t: Template): Partial<ProjectSettings> {
  return { fontFamily: t.fontFamily, fontSizePt: t.fontSizePt, wordGoal: t.wordGoal, template: t.id }
}
