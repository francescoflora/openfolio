import { useState } from 'react'
import { BookOpen, ChevronUp, Clapperboard, Clock, FileUp, FolderOpen, Info, Moon, Sun, Trash2 } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { TEMPLATES, templateOpts } from '@/core/templates'
import { listRecent, removeRecent } from '@/core/persistence'
import type { RecentProject } from '@/core/persistence'
import { uiText } from '@/core/i18n'
import { LanguageMenu } from '@/features/topbar/LanguageMenu'
import { UpdateMenu } from '@/features/topbar/UpdateMenu'
import { AboutModal } from '@/features/topbar/AboutModal'
import { WindowControls } from '@/features/topbar/WindowControls'
import { toggleWindowMaximize } from '@/core/windowSize'
import { cn } from '@/lib/cn'
import logo from '@/assets/logo.svg'

export function StartScreen() {
  const newProject = useProject((s) => s.newProject)
  const openProject = useProject((s) => s.openProject)
  const importProject = useProject((s) => s.importProject)
  const openRecentProject = useProject((s) => s.openRecentProject)
  const setTheme = useProject((s) => s.setTheme)
  const theme = useProject((s) => s.theme)
  const lang = useProject((s) => s.language)
  const [recents, setRecents] = useState<RecentProject[]>(() => listRecent())
  const [importOpen, setImportOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const t = uiText(lang)

  const drop = (path: string) => {
    removeRecent(path)
    setRecents(listRecent())
  }

  const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, a, [data-interactive]')) {
      return
    }
    void toggleWindowMaximize()
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-canvas">
      {/* Title Bar Integrata */}
      <div
        className="flex h-10 w-full shrink-0 items-center justify-between border-b border-border/70 bg-white dark:bg-canvas pl-3 pr-0 select-none"
        data-tauri-drag-region
        onDoubleClick={handleTitleBarDoubleClick}
      >
        <div className="flex items-center gap-2 pl-0.5 pointer-events-none select-none" data-tauri-drag-region>
          <img src={logo} alt="" className="h-4.5 w-4.5 drop-shadow-sm" />
          <span className="font-brand text-xs font-semibold tracking-tight text-ink">
            Open<span className="text-amber-500">Folio</span>
          </span>
        </div>

        <div className="flex flex-1 h-full" data-tauri-drag-region />

        <div className="flex h-full items-center gap-1 sm:gap-1.5" data-tauri-drag-region="false">
          <button
            className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={t.themeBtn}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <LanguageMenu />
          <UpdateMenu />
          <button
            className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer"
            onClick={() => setAboutOpen(true)}
            title={t.aboutBtn}
          >
            <Info className="h-4 w-4" />
          </button>
          <WindowControls />
        </div>
      </div>

      {/* Contenuto principale StartScreen (due colonne stile IntelliJ) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Colonna Sinistra: Modelli e Azioni di Apertura/Importazione */}
        <div className="flex flex-1 min-h-0 min-w-0 flex-col justify-between p-4 sm:p-5 overflow-y-auto overflow-x-hidden">
          {/* Sezione Superiore: spiegazione con separatore elegante + modelli in alto */}
          <div className="flex flex-col shrink-0">
            {/* Scritta che spiega cosa fare adesso, centrata con tono più chiaro e meno marcato */}
            <div className="pb-2.5 border-b border-border/70 select-none text-center">
              <p className="text-xs sm:text-sm font-normal text-ink-soft tracking-normal leading-snug">
                {t.startSubtitle}
              </p>
            </div>

            {/* Modelli di progetto (Sceneggiatura e Romanzo) posizionati in alto */}
            <div className="mt-3 flex flex-col gap-2 max-w-md w-full">
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon
                const name = tpl.mode === 'screenplay' ? t.templateScreenplayName : t.templateNovelName
                const desc = tpl.mode === 'screenplay' ? t.templateScreenplayDesc : t.templateNovelDesc
                return (
                  <button
                    key={tpl.id}
                    className="group flex items-center gap-3 rounded-xl border border-border/80 bg-surface-2/30 dark:bg-surface/40 px-3.5 py-2.5 text-left transition-all hover:border-accent hover:bg-surface-2/80 hover:shadow-xs cursor-pointer"
                    onClick={() => newProject(tpl.mode, undefined, templateOpts(tpl))}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-2 text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent/10">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-ink transition-colors group-hover:text-accent leading-tight">
                        {name}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft truncate">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* In basso a sinistra: Apri progetto e Importa */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 mt-auto pt-3">
            <button
              className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-xs sm:text-sm font-medium text-accent-ink hover:opacity-90 cursor-pointer transition-opacity shadow-xs"
              title={t.openProjectTitle}
              onClick={() => void openProject()}
            >
              <FolderOpen className="h-3.5 w-3.5" /> {t.openProjectBtn}
            </button>

            <div className="relative">
              <button
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-border/80 bg-surface-2/40 dark:bg-surface/40 px-3 py-1.5 text-xs sm:text-sm font-medium text-ink-soft hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors',
                  importOpen && 'bg-surface-2 text-ink border-accent/50',
                )}
                title={t.importHeader}
                onClick={() => setImportOpen((o) => !o)}
              >
                <FileUp className="h-3.5 w-3.5 text-accent" />
                <span>{t.importHeader}…</span>
                <ChevronUp className={cn('h-3.5 w-3.5 transition-transform duration-200', importOpen && 'rotate-180')} />
              </button>

              {importOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setImportOpen(false)} />
                  <div className="absolute left-0 bottom-full mb-1.5 z-20 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl">
                    <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t.importHeader}
                    </div>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors"
                      onClick={() => {
                        setImportOpen(false)
                        void importProject('fountain')
                      }}
                    >
                      <FileUp className="h-4 w-4 text-ink-faint shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">Fountain</div>
                        <div className="text-[11px] text-ink-faint">.fountain, .spmd</div>
                      </div>
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors"
                      onClick={() => {
                        setImportOpen(false)
                        void importProject('fdx')
                      }}
                    >
                      <FileUp className="h-4 w-4 text-ink-faint shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">Final Draft</div>
                        <div className="text-[11px] text-ink-faint">.fdx</div>
                      </div>
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink cursor-pointer transition-colors"
                      onClick={() => {
                        setImportOpen(false)
                        void importProject('txt')
                      }}
                    >
                      <FileUp className="h-4 w-4 text-ink-faint shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">{t.importTxtBtn.replace('…', '')}</div>
                        <div className="text-[11px] text-ink-faint">.txt</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Colonna Destra: Recenti in verticale (stile IntelliJ) */}
        <div className="w-52 sm:w-56 shrink-0 border-l border-border/70 bg-surface-2/25 dark:bg-surface/20 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <Clock className="h-3.5 w-3.5 text-accent" /> {t.recentsHeader}
            </div>
            {recents.length > 0 && (
              <span className="text-[10px] font-medium text-ink-faint rounded-full bg-surface-2 px-1.5 py-0.5">
                {recents.length}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2">
            {recents.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {recents.map((r) => (
                  <li
                    key={r.path}
                    className="group relative flex items-center gap-2 rounded-lg p-2 hover:bg-surface-2 dark:hover:bg-surface/80 border border-transparent hover:border-border/60 transition-all cursor-pointer"
                  >
                    <button
                      className="flex min-w-0 flex-1 items-start gap-2.5 text-left cursor-pointer"
                      onClick={() => void openRecentProject(r.path)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface-2 text-ink-muted group-hover:text-accent group-hover:border-accent/40 mt-0.5 transition-colors">
                        {r.mode === 'screenplay' ? (
                          <Clapperboard className="h-3.5 w-3.5" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-ink group-hover:text-accent transition-colors">
                          {r.title || 'Senza titolo'}
                        </div>
                        <div className="truncate text-[10px] text-ink-faint mt-0.5" title={r.path}>
                          {r.path}
                        </div>
                      </div>
                    </button>
                    <button
                      className="shrink-0 rounded p-1 text-ink-faint opacity-0 hover:bg-surface hover:text-red-500 group-hover:opacity-100 cursor-pointer transition-opacity"
                      title={t.removeRecentTitle}
                      onClick={() => drop(r.path)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center p-4 select-none">
                <Clock className="h-7 w-7 text-ink-faint/30 mb-2 stroke-[1.5]" />
                <p className="text-xs text-ink-faint font-medium">{t.noRecentsLabel}</p>
                <p className="text-[10px] text-ink-faint/70 mt-0.5 max-w-[160px] leading-relaxed">
                  {t.noRecentsHint}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

