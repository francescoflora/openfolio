import { useState } from 'react'
import { BookOpen, Check, ChevronDown, Download, FilePlus2, FileUp, FolderOpen, Info, LayoutGrid, List, Moon, PenLine, Save, Sun, X } from 'lucide-react'
import { useProject } from '@/store/useProject'
import type { ViewMode } from '@/store/useProject'
import { EXPORT_LABEL, FORMATS_BY_MODE, runExport } from '@/features/export/actions'
import { TEMPLATES, templateOpts } from '@/core/templates'
import { uiText } from '@/core/i18n'
import { LanguageMenu } from '@/features/topbar/LanguageMenu'
import { TitlePageModal } from '@/features/topbar/TitlePageModal'
import { UpdateMenu } from '@/features/topbar/UpdateMenu'
import { AboutModal } from '@/features/topbar/AboutModal'
import { APP_NAME } from '@/core/appinfo'
import logo from '@/assets/logo.svg'
import { cn } from '@/lib/cn'

const VIEWS: { id: ViewMode; icon: typeof PenLine; label: string }[] = [
  { id: 'editor', icon: PenLine, label: 'Editor' },
  { id: 'corkboard', icon: LayoutGrid, label: 'Corkboard' },
  { id: 'outline', icon: List, label: 'Outline' },
]

export function TopBar() {
  const mode = useProject((s) => s.project?.mode)
  const lang = useProject((s) => s.language)
  const dirty = useProject((s) => s.dirty)
  const theme = useProject((s) => s.theme)
  const view = useProject((s) => s.view)
  const toast = useProject((s) => s.toast)
  const newProject = useProject((s) => s.newProject)
  const openProject = useProject((s) => s.openProject)
  const importProject = useProject((s) => s.importProject)
  const closeProject = useProject((s) => s.closeProject)
  const save = useProject((s) => s.save)
  const setTheme = useProject((s) => s.setTheme)
  const setView = useProject((s) => s.setView)
  const [menu, setMenu] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const [saveMenu, setSaveMenu] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const t = uiText(lang)
  const formats = mode ? FORMATS_BY_MODE[mode] : []

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3 gap-2">
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="flex shrink-0 items-center gap-2.5 pr-2 select-none">
          <img
            src={logo}
            alt={APP_NAME}
            className="h-7 w-7 drop-shadow-sm"
          />
          <span className="hidden items-center font-brand text-sm font-bold tracking-tight text-ink leading-none md:inline-flex">
            Open<span className="text-amber-500">Folio</span>
          </span>
        </div>

        <div className="relative">
          <button
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-soft hover:bg-surface-2 transition-colors cursor-pointer',
              menu && 'bg-surface-2 text-ink',
            )}
            title={t.newBtn}
            onClick={() => setMenu((m) => !m)}
          >
            <FilePlus2 className="h-4 w-4" />
            <span className="hidden xl:inline">{t.newBtn}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                {TEMPLATES.map((tpl) => {
                  const name = tpl.mode === 'screenplay' ? t.templateScreenplayName : t.templateNovelName
                  return (
                    <button
                      key={tpl.id}
                      className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                      onClick={() => {
                        newProject(tpl.mode, undefined, templateOpts(tpl))
                        setMenu(false)
                      }}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center rounded-md text-ink-soft hover:bg-surface-2 transition-colors',
              openMenu && 'bg-surface-2 text-ink',
            )}
          >
            <button
              className="flex items-center gap-1.5 rounded-l-md px-2 py-1 text-sm hover:text-ink transition-colors cursor-pointer"
              title={t.openProjectTitle}
              onClick={() => openProject()}
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden xl:inline">{t.openBtn}</span>
            </button>
            <button
              className="rounded-r-md px-1 py-1.5 hover:text-ink transition-colors cursor-pointer"
              title={t.moreOpenOptions}
              onClick={() => setOpenMenu((m) => !m)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {openMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-72 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    void openProject()
                  }}
                >
                  {t.openProjectBtn}
                </button>
                <div className="my-1 border-t border-border" />
                <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <FileUp className="h-3.5 w-3.5" /> {t.importHeader}
                </div>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    void importProject('fountain')
                  }}
                >
                  {t.importFountainMenu}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    void importProject('fdx')
                  }}
                >
                  {t.importFdxMenu}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    void importProject('txt')
                  }}
                >
                  {t.importTxtMenu}
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                  onClick={() => {
                    setOpenMenu(false)
                    closeProject()
                  }}
                >
                  <X className="h-4 w-4 text-ink-faint" /> {t.closeProjectMenu}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center rounded-md text-ink-soft hover:bg-surface-2 transition-colors',
              saveMenu && 'bg-surface-2 text-ink',
            )}
          >
            <button
              className="flex items-center gap-1.5 rounded-l-md px-2 py-1 text-sm hover:text-ink transition-colors cursor-pointer"
              title={t.saveProjectTitle}
              onClick={() => void save()}
            >
              <Save className="h-4 w-4" />
              <span className="hidden xl:inline">{t.saveBtn}</span>
            </button>
            <button
              className="rounded-r-md px-1 py-1.5 hover:text-ink transition-colors cursor-pointer"
              title={t.moreSaveOptions}
              onClick={() => setSaveMenu((m) => !m)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {saveMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSaveMenu(false)} />
              <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2"
                  onClick={() => {
                    setSaveMenu(false)
                    void save()
                  }}
                >
                  {t.saveBtn}
                </button>
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-2"
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

          {toast && (
            <div className="absolute left-0 top-10 z-30 flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink shadow-lg">
              <Check className="h-3.5 w-3.5 text-green-600" />
              {toast.message}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center min-w-0 px-2">
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
          {VIEWS.map((v) => {
            const Icon = v.icon
            return (
              <button
                key={v.id}
                title={v.label}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs cursor-pointer',
                  view === v.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
                )}
                onClick={() => setView(v.id)}
              >
                <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{v.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
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

        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

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
      </div>

      {bookOpen && <TitlePageModal onClose={() => setBookOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </header>
  )
}
