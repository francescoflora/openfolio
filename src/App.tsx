import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { TopBar } from '@/features/topbar/TopBar'
import { OperationNotice } from '@/features/topbar/OperationNotice'
import { Binder } from '@/features/binder/Binder'
import { Editor } from '@/features/editor/Editor'
import { Corkboard } from '@/features/corkboard/Corkboard'
import { Outline } from '@/features/outline/Outline'
import { Inspector } from '@/features/inspector/Inspector'
import { StatusBar } from '@/features/statusbar/StatusBar'
import { StartScreen } from '@/features/start/StartScreen'
import { SplashScreen } from '@/features/splash/SplashScreen'
import { useProject } from '@/store/useProject'
import { useUpdater } from '@/store/useUpdater'
import { hasStoredLanguage, isTauri } from '@/core/persistence'
import { applyDefaultAppSize, applyStartWindowSize } from '@/core/windowSize'
import { uiText } from '@/core/i18n'
import type { Language } from '@/core/types'
import logo from '@/assets/logo.svg'

function Welcome() {
  const project = useProject((s) => s.project)
  const lang = useProject((s) => s.language)
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
  const [isAppReady, setIsAppReady] = useState(false)
  const selectedId = useProject((s) => s.selectedId)
  const hasProject = useProject((s) => s.project !== null)
  const mode = useProject((s) => s.project?.mode)

  useEffect(() => {
    const s = useProject.getState()
    s.setTheme(s.theme)
  }, [])

  useEffect(() => {
    void useUpdater.getState().check(true)
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

  // Caricamento reale all'avvio: font tipografici + lingua installer + eventuale file aperto con doppio clic
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const fontsPromise =
          'fonts' in document ? document.fonts.ready.catch(() => {}) : Promise.resolve()

        let tauriPromise = Promise.resolve()
        if (isTauri()) {
          tauriPromise = (async () => {
            try {
              const { invoke } = await import('@tauri-apps/api/core')
              if (!hasStoredLanguage()) {
                const lang = await invoke<string | null>('installer_language').catch(() => null)
                if (lang === 'en' || lang === 'it') {
                  useProject.getState().setLanguage(lang as Language)
                }
              }
              const launchPath = await invoke<string | null>('launch_file').catch(() => null)
              if (launchPath) {
                await useProject.getState().openRecentProject(launchPath).catch(() => {})
              }
            } catch (err) {
              console.warn('Tauri startup init error', err)
            }
          })()
        }

        await Promise.all([fontsPromise, tauriPromise])
      } finally {
        if (!cancelled) {
          setIsAppReady(true)
        }
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [])

  const view = useProject((s) => s.view)
  const binderOpen = useProject((s) => s.binderOpen)
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

  const prevHasProjectRef = useRef<boolean | null>(null)

  const handleSplashFinish = useCallback(async () => {
    setShowSplash(false)
    if (isTauri()) {
      try {
        const currentHasProject = useProject.getState().project !== null
        prevHasProjectRef.current = currentHasProject
        if (currentHasProject) {
          await applyDefaultAppSize()
        }
      } catch (err) {
        console.warn('Splash transition error', err)
      }
    }
  }, [])

  useEffect(() => {
    if (showSplash) return

    if (prevHasProjectRef.current === null) {
      prevHasProjectRef.current = hasProject
      return
    }

    if (!prevHasProjectRef.current && hasProject) {
      prevHasProjectRef.current = true
      void applyDefaultAppSize()
    } else if (prevHasProjectRef.current && !hasProject) {
      prevHasProjectRef.current = false
      void applyStartWindowSize()
    }
  }, [hasProject, showSplash])

  return (
    <>
      {showSplash && <SplashScreen isReady={isAppReady} onFinish={handleSplashFinish} />}
      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        {!hasProject || !mode ? (
          <StartScreen />
        ) : (
          <>
            <TopBar />
            <div className="flex min-h-0 min-w-0 flex-1">
              {binderOpen && <Binder />}
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
      <OperationNotice />
    </>
  )
}
