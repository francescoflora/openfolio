import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { TopBar } from '@/features/topbar/TopBar'
import { Binder } from '@/features/binder/Binder'
import { Editor } from '@/features/editor/Editor'
import { Corkboard } from '@/features/corkboard/Corkboard'
import { Outline } from '@/features/outline/Outline'
import { Inspector } from '@/features/inspector/Inspector'
import { StatusBar } from '@/features/statusbar/StatusBar'
import { StartScreen } from '@/features/start/StartScreen'
import { SplashScreen } from '@/features/splash/SplashScreen'
import { useProject } from '@/store/useProject'
import { hasStoredLanguage, isTauri } from '@/core/persistence'
import { uiText } from '@/core/i18n'
import type { Language } from '@/core/types'
import logo from '@/assets/logo.svg'

function Welcome() {
  const project = useProject((s) => s.project)
  const lang = useProject((s) => s.project?.settings.language ?? s.language)
  const addScene = useProject((s) => s.addScene)
  if (!project) return null
  const title = project.settings.titlePage?.title || project.title
  const t = uiText(lang)

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-canvas text-center">
      <img src={logo} alt="OpenFolio" className="h-16 w-16 drop-shadow-md" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {project.mode === 'screenplay' ? t.welcomeScreenplay : t.welcomeNovel} · {t.welcomeHint}
        </p>
      </div>
      <button
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90"
        onClick={() => addScene(null)}
      >
        <Plus className="h-4 w-4" /> {t.newSceneBtn}
      </button>
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const selectedId = useProject((s) => s.selectedId)
  const hasProject = useProject((s) => s.project !== null)
  const mode = useProject((s) => s.project?.mode)

  useEffect(() => {
    const s = useProject.getState()
    s.setTheme(s.theme)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const s = useProject.getState()
        if (!s.project) return
        e.preventDefault()
        void s.save({ saveAs: e.shiftKey })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!isTauri()) return
    void import('@tauri-apps/api/core').then(({ invoke }) => {
      if (!hasStoredLanguage()) {
        void invoke<string | null>('installer_language').then((lang) => {
          if (lang === 'en' || lang === 'it') {
            useProject.getState().setLanguage(lang as Language)
          }
        })
      }
      void invoke<string | null>('launch_file').then((path) => {
        if (path) void useProject.getState().openRecentProject(path)
      })
    })
  }, [])

  const view = useProject((s) => s.view)
  const inspectorOpen = useProject((s) => s.inspectorOpen)
  const hasScene = !!(selectedId && hasProject)

  const projectTitle = useProject((s) =>
    s.project ? s.project.settings.titlePage?.title || s.project.title : null,
  )
  useEffect(() => {
    const full = projectTitle ? `OpenFolio - ${projectTitle}` : 'OpenFolio'
    document.title = full
    if (isTauri()) {
      void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().setTitle(full))
    }
  }, [projectTitle])

  const handleSplashFinish = async () => {
    setShowSplash(false)
    if (isTauri()) {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const win = getCurrentWindow()
        await win.setDecorations(true)
        await win.setSkipTaskbar(false)
      } catch (err) {
        console.warn('Could not restore window decorations', err)
      }
    }
  }

  useEffect(() => {
    if (!isTauri() || showSplash) return
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const { LogicalSize } = await import('@tauri-apps/api/dpi')
      const win = getCurrentWindow()
      try {
        if (hasProject) {
          const max = await win.isMaximized().catch(() => false)
          await win.setMinSize(new LogicalSize(900, 600))
          if (!max) {
            await win.setSize(new LogicalSize(1280, 820))
            await win.center()
          }
        } else {
          const max = await win.isMaximized().catch(() => false)
          if (max) {
            await win.unmaximize().catch(() => {})
          }
          await win.setMinSize(new LogicalSize(640, 460))
          await win.setSize(new LogicalSize(760, 520))
          await win.center()
        }
      } catch (err) {
        console.warn('Auto-resize window error', err)
      }
    })
  }, [hasProject, showSplash])

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        {!hasProject || !mode ? (
          <StartScreen />
        ) : (
          <>
            <TopBar />
            <div className="flex min-h-0 min-w-0 flex-1">
              <Binder />
              {view === 'corkboard' ? (
                <Corkboard />
              ) : view === 'outline' ? (
                <Outline />
              ) : hasScene && selectedId ? (
                <Editor key={selectedId} sceneId={selectedId} mode={mode} />
              ) : (
                <Welcome />
              )}
              {view === 'editor' && inspectorOpen && <Inspector />}
            </div>
            <StatusBar />
          </>
        )}
      </div>
    </>
  )
}
