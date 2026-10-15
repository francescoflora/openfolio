import { useState } from 'react'
import { BookOpen, Clapperboard, Clock, FileUp, FolderOpen, Moon, Sun, Trash2 } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { TEMPLATES, templateOpts } from '@/core/templates'
import { listRecent, removeRecent, isTauri } from '@/core/persistence'
import type { RecentProject } from '@/core/persistence'
import { uiText } from '@/core/i18n'
import { LanguageMenu } from '@/features/topbar/LanguageMenu'
import logo from '@/assets/logo.svg'

export function StartScreen() {
  const newProject = useProject((s) => s.newProject)
  const openProject = useProject((s) => s.openProject)
  const importProject = useProject((s) => s.importProject)
  const openRecentProject = useProject((s) => s.openRecentProject)
  const setTheme = useProject((s) => s.setTheme)
  const theme = useProject((s) => s.theme)
  const lang = useProject((s) => s.language)
  const [recents, setRecents] = useState<RecentProject[]>(() => (isTauri() ? listRecent() : []))
  const t = uiText(lang)

  const drop = (path: string) => {
    removeRecent(path)
    setRecents(listRecent())
  }

  return (
    <div className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-auto bg-canvas p-6">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageMenu />
        <button
          className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={t.themeBtn}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <img src={logo} alt="OpenFolio" className="h-11 w-11 drop-shadow-sm" />
          <div>
            <h1 className="font-brand text-2xl font-bold tracking-tight text-ink">
              Open<span className="text-amber-500">Folio</span>
            </h1>
            <p className="text-xs text-ink-soft">{t.startSubtitle}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon
            const name = tpl.mode === 'screenplay' ? t.templateScreenplayName : t.templateNovelName
            const desc = tpl.mode === 'screenplay' ? t.templateScreenplayDesc : t.templateNovelDesc
            return (
              <button
                key={tpl.id}
                className="group flex items-start gap-3 rounded-xl border border-border p-3.5 text-left transition-all hover:border-accent hover:bg-surface-2 hover:shadow-sm"
                onClick={() => newProject(tpl.mode, undefined, templateOpts(tpl))}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent/10">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink transition-colors group-hover:text-accent">
                    {name}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90 cursor-pointer"
            title={t.openProjectTitle}
            onClick={() => void openProject()}
          >
            <FolderOpen className="h-4 w-4" /> {t.openProjectBtn}
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2 cursor-pointer"
            title={t.importFountainTitle}
            onClick={() => void importProject('fountain')}
          >
            <FileUp className="h-4 w-4" /> Fountain…
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2 cursor-pointer"
            title={t.importFdxTitle}
            onClick={() => void importProject('fdx')}
          >
            <FileUp className="h-4 w-4" /> Final Draft…
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2 cursor-pointer"
            title={t.importTxtTitle}
            onClick={() => void importProject('txt')}
          >
            <FileUp className="h-4 w-4" /> {t.importTxtBtn}
          </button>
        </div>

        {isTauri() && recents.length > 0 && (
          <div className="mt-5 border-t border-border pt-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <Clock className="h-3.5 w-3.5" /> {t.recentsHeader}
            </div>
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto pr-1">
              {recents.map((r) => (
                <li key={r.path} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                  <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => void openRecentProject(r.path)}>
                    {r.mode === 'screenplay' ? (
                      <Clapperboard className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    ) : (
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    )}
                    <span className="truncate text-sm text-ink">{r.title}</span>
                    <span className="truncate text-xs text-ink-faint">{r.path}</span>
                  </button>
                  <button
                    className="shrink-0 rounded p-1 text-ink-faint opacity-0 hover:bg-surface group-hover:opacity-100"
                    title={t.removeRecentTitle}
                    onClick={() => drop(r.path)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
