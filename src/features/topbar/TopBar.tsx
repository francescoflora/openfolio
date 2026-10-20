import { useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock,
  Download,
  FilePlus2,
  FileText,
  FileUp,
  FolderOpen,
  Hash,
  Info,
  MessageSquareText,
  Moon,
  Save,
  Sun,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { useProject } from '@/store/useProject'
import { EXPORT_LABEL, FORMATS_BY_MODE, runExport } from '@/features/export/actions'
import { TEMPLATES, templateOpts } from '@/core/templates'
import { uiText } from '@/core/i18n'
import { listRecent, clearRecents } from '@/core/persistence'
import type { RecentProject } from '@/core/persistence'
import { LanguageMenu } from '@/features/topbar/LanguageMenu'
import { TitlePageModal } from '@/features/topbar/TitlePageModal'
import { UpdateMenu } from '@/features/topbar/UpdateMenu'
import { AboutModal } from '@/features/topbar/AboutModal'
import { MoresContinuedsModal } from '@/features/topbar/MoresContinuedsModal'
import { FontModal } from '@/features/editor/FontModal'
import { WindowControls } from '@/features/topbar/WindowControls'
import { toggleWindowMaximize } from '@/core/windowSize'
import { APP_NAME } from '@/core/appinfo'
import logo from '@/assets/logo.svg'
import { cn } from '@/lib/cn'

export function TopBar() {
  const projectTitle = useProject((s) =>
    s.project ? s.project.settings.titlePage?.title || s.project.title : null,
  )
  const mode = useProject((s) => s.project?.mode)
  const lang = useProject((s) => s.language)
  const dirty = useProject((s) => s.dirty)
  const theme = useProject((s) => s.theme)
  const newProject = useProject((s) => s.newProject)
  const openProject = useProject((s) => s.openProject)
  const openRecentProject = useProject((s) => s.openRecentProject)
  const importProject = useProject((s) => s.importProject)
  const save = useProject((s) => s.save)
  const setTheme = useProject((s) => s.setTheme)
  const updateSettings = useProject((s) => s.updateSettings)
  const pageNumbers = useProject((s) => s.project?.settings.pageNumbers !== false)
  const [menu, setMenu] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [recentsOpen, setRecentsOpen] = useState(false)
  const [recents, setRecents] = useState<RecentProject[]>([])
  const [saveMenu, setSaveMenu] = useState(false)
  const [docMenu, setDocMenu] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [moresOpen, setMoresOpen] = useState(false)
  const [fontModalOpen, setFontModalOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const t = uiText(lang)
  const formats = mode ? FORMATS_BY_MODE[mode] : []

  const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, a, [data-interactive]')) {
      return
    }
    void toggleWindowMaximize()
  }

  return (
    <header
      className="relative flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface pl-3 pr-0 gap-2 select-none"
      data-tauri-drag-region
      onDoubleClick={handleTitleBarDoubleClick}
    >
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="flex shrink-0 items-center pr-1 select-none pointer-events-none" data-tauri-drag-region>
          <img
            src={logo}
            alt={APP_NAME}
            className="h-4 w-4 drop-shadow-sm"
          />
        </div>

        {/* Pulsante Nuovo (Unificato con freccia per la scelta tra Romanzo e Sceneggiatura) */}
        <div className="relative shrink-0">
          <button
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-sm text-ink-soft transition-colors cursor-pointer',
              'hover:border-border hover:bg-surface-2 hover:text-ink hover:shadow-2xs',
              menu && 'border-border bg-surface-2 text-ink shadow-2xs',
            )}
            title={t.newBtn}
            onClick={() => setMenu((m) => !m)}
          >
            <FilePlus2 className="h-4 w-4" />
            <span className="hidden xl:inline">{t.newBtn}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', menu && 'rotate-180')} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                {TEMPLATES.map((tpl) => {
                  const Icon = tpl.icon
                  const name = tpl.mode === 'screenplay' ? t.templateScreenplayName : t.templateNovelName
                  return (
                    <button
                      key={tpl.id}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                      onClick={() => {
                        newProject(tpl.mode, undefined, templateOpts(tpl))
                        setMenu(false)
                      }}
                    >
                      <Icon className="h-4 w-4 text-ink-faint shrink-0" />
                      <span>{name}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Pulsante Apri (Split Button) */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'group flex items-center rounded-md border border-transparent text-ink-soft overflow-hidden transition-colors',
              'hover:border-border hover:bg-surface/50 hover:shadow-2xs',
              openMenu && 'border-border bg-surface/50 shadow-2xs',
            )}
          >
            <button
              className="flex h-7 items-center gap-1.5 px-2 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              title={t.openProjectTitle}
              onClick={() => void openProject()}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden xl:inline">{t.openBtn}</span>
            </button>
            <button
              className={cn(
                'flex h-7 items-center justify-center border-l border-transparent group-hover:border-border px-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer',
                openMenu && 'border-border bg-surface-2 text-ink',
              )}
              title={t.moreOpenOptions}
              onClick={() => {
                setOpenMenu((m) => {
                  const next = !m
                  if (next) {
                    setRecents(listRecent())
                    setRecentsOpen(false)
                  }
                  return next
                })
              }}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', openMenu && 'rotate-180')} />
            </button>
          </div>

          {openMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setOpenMenu(false)
                  setRecentsOpen(false)
                }}
              />
              <div className="absolute left-0 top-9 z-20 w-72 rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    setRecentsOpen(false)
                    void openProject()
                  }}
                >
                  <FolderOpen className="h-4 w-4 text-ink-faint shrink-0" />
                  <span>{t.openProjectBtn}</span>
                </button>

                {/* Voce Recenti con sottomenu flyout */}
                <div
                  className="relative"
                  onMouseEnter={() => setRecentsOpen(true)}
                  onMouseLeave={() => setRecentsOpen(false)}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer',
                      recentsOpen && 'bg-surface-2 text-ink',
                    )}
                    onClick={() => setRecentsOpen((v) => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-ink-faint shrink-0" />
                      <span>{t.openRecentMenu}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                  </button>

                  {recentsOpen && (
                    <div
                      className="absolute left-full top-0 -ml-0.5 w-80 rounded-lg border border-border bg-surface py-1 shadow-xl z-30 before:absolute before:-left-2 before:top-0 before:w-2 before:h-full"
                      data-tauri-drag-region="false"
                    >
                      {recents.length > 0 ? (
                        <>
                          <div className="max-h-72 overflow-y-auto py-0.5">
                            {recents.map((r) => (
                              <button
                                key={r.path}
                                className="group flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                                onClick={() => {
                                  setOpenMenu(false)
                                  setRecentsOpen(false)
                                  void openRecentProject(r.path)
                                }}
                                title={r.path}
                              >
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border/70 bg-surface-2 text-ink-muted group-hover:text-accent group-hover:border-accent/40 transition-colors">
                                  {r.mode === 'screenplay' ? (
                                    <Clapperboard className="h-3 w-3" />
                                  ) : (
                                    <BookOpen className="h-3 w-3" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-ink group-hover:text-accent transition-colors">
                                    {r.title || 'Senza titolo'}
                                  </div>
                                  <div className="truncate text-[10px] text-ink-faint" title={r.path}>
                                    {r.path}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="my-1 border-t border-border" />
                          <button
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink-faint hover:text-red-500 hover:bg-surface-2 transition-colors cursor-pointer"
                            onClick={() => {
                              clearRecents()
                              setRecents([])
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>{t.clearRecentsMenu}</span>
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-3 text-center text-xs text-ink-faint">
                          {t.noRecentsLabel}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="my-1 border-t border-border" />
                <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <FileUp className="h-3.5 w-3.5" /> {t.importHeader}
                </div>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    setRecentsOpen(false)
                    void importProject('fountain')
                  }}
                >
                  {t.importFountainMenu}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    setRecentsOpen(false)
                    void importProject('fdx')
                  }}
                >
                  {t.importFdxMenu}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    setRecentsOpen(false)
                    void importProject('txt')
                  }}
                >
                  {t.importTxtMenu}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Pulsante Salva (Split Button) */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'group flex items-center rounded-md border border-transparent text-ink-soft overflow-hidden transition-colors',
              'hover:border-border hover:bg-surface/50 hover:shadow-2xs',
              saveMenu && 'border-border bg-surface/50 shadow-2xs',
            )}
          >
            <button
              className="flex h-7 items-center gap-1.5 px-2 text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              title={t.saveProjectTitle}
              onClick={() => void save()}
            >
              <Save className="h-4 w-4" />
              <span className="hidden xl:inline">{t.saveBtn}</span>
            </button>
            <button
              className={cn(
                'flex h-7 items-center justify-center border-l border-transparent group-hover:border-border px-1.5 text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer',
                saveMenu && 'border-border bg-surface-2 text-ink',
              )}
              title={t.moreSaveOptions}
              onClick={() => setSaveMenu((m) => !m)}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', saveMenu && 'rotate-180')} />
            </button>
          </div>

          {saveMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSaveMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setSaveMenu(false)
                    void save()
                  }}
                >
                  {t.saveBtn}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setSaveMenu(false)
                    void save({ saveAs: true })
                  }}
                >
                  {t.saveAsMenu}
                </button>
                <div className="my-1 border-t border-border" />
                <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <Download className="h-3.5 w-3.5" /> {t.exportHeader}
                </div>
                {formats.map((f) => (
                  <button
                    key={f}
                    className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                    onClick={() => {
                      setSaveMenu(false)
                      void runExport(f)
                    }}
                  >
                    {f === 'txt' ? t.exportTxt : EXPORT_LABEL[f]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Menu Documento */}
        <div className="relative shrink-0">
          <button
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-sm text-ink-soft transition-colors cursor-pointer',
              'hover:border-border hover:bg-surface-2 hover:text-ink hover:shadow-2xs',
              docMenu && 'border-border bg-surface-2 text-ink shadow-2xs',
            )}
            title={t.documentMenu}
            onClick={() => setDocMenu((m) => !m)}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden xl:inline">{t.documentMenu}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', docMenu && 'rotate-180')} />
          </button>

          {docMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDocMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-64 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                  onClick={() => {
                    setDocMenu(false)
                    setBookOpen(true)
                  }}
                >
                  <BookOpen className="h-4 w-4 text-ink-faint shrink-0" />
                  <span>{t.titlePageBtn}</span>
                </button>

                {mode === 'screenplay' && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                    onClick={() => {
                      setDocMenu(false)
                      setMoresOpen(true)
                    }}
                  >
                    <MessageSquareText className="h-4 w-4 text-ink-faint shrink-0" />
                    <span>{t.moresMenu}</span>
                  </button>
                )}

                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                  onClick={() => {
                    setDocMenu(false)
                    setFontModalOpen(true)
                  }}
                >
                  <Type className="h-4 w-4 text-ink-faint shrink-0" />
                  <span>{t.elementFontsMenu}</span>
                </button>

                <div className="my-1 border-t border-border" />

                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                  onClick={() => {
                    updateSettings({ pageNumbers: !pageNumbers })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-ink-faint shrink-0" />
                    <span>{t.pageNumbersMenu}</span>
                  </div>
                  {pageNumbers && <Check className="h-4 w-4 text-accent shrink-0" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drag region centrale */}
      <div className="flex flex-1 h-full min-w-4" data-tauri-drag-region />

      {/* Nome progetto al centro della top bar */}
      {projectTitle && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full items-center justify-center">
          <div
            className="max-w-[28%] truncate select-none text-center text-xs font-semibold text-ink-soft tracking-tight"
            title={projectTitle}
          >
            {projectTitle}
          </div>
        </div>
      )}

      {/* Sezione destra */}
      <div className="flex shrink-0 h-full items-center justify-end gap-1 sm:gap-1.5" data-tauri-drag-region="false">

        {/* Stato salvataggio */}
        <span
          className={cn('relative hidden shrink-0 lg:inline-flex', dirty ? 'text-red-500' : 'text-green-600')}
          title={dirty ? t.unsavedChanges : t.savedChanges}
        >
          <Save className="h-4 w-4" />
          {dirty ? (
            <X className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-surface" strokeWidth={3} />
          ) : (
            <Check className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-surface" strokeWidth={3} />
          )}
        </span>
        <button
          className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 cursor-pointer"
          onClick={() => setBookOpen(true)}
          title={t.titlePageBtn}
        >
          <BookOpen className="h-4 w-4" />
        </button>

        <span className="mx-0.5 h-4 w-px shrink-0 bg-border" />

        <button
          className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 cursor-pointer"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={t.themeBtn}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <LanguageMenu />
        <UpdateMenu />
        <button
          className="rounded-md p-1.5 text-ink-soft hover:bg-surface-2 cursor-pointer"
          onClick={() => setAboutOpen(true)}
          title={t.aboutBtn}
        >
          <Info className="h-4 w-4" />
        </button>
        <WindowControls />
      </div>

      {bookOpen && <TitlePageModal onClose={() => setBookOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
      {moresOpen && <MoresContinuedsModal onClose={() => setMoresOpen(false)} />}
      {fontModalOpen && mode && (
        <FontModal
          isOpen={fontModalOpen}
          mode={mode}
          onClose={() => setFontModalOpen(false)}
        />
      )}
    </header>
  )
}
