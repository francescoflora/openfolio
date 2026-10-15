import { useEffect, useState } from 'react'
import { uiText } from '@/core/i18n'
import { useProject } from '@/store/useProject'
import logo from '@/assets/logo.svg'

interface SplashScreenProps {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fading, setFading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(15)
  const lang = useProject((s) => s.language)
  const t = uiText(lang)

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStepIndex(1)
      setProgress(50)
    }, 350)

    const t2 = setTimeout(() => {
      setStepIndex(2)
      setProgress(85)
    }, 750)

    const t3 = setTimeout(() => {
      setStepIndex(3)
      setProgress(100)
    }, 1100)

    const tFade = setTimeout(() => {
      setFading(true)
    }, 1350)

    const tDone = setTimeout(() => {
      onFinish()
    }, 1750)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(tFade)
      clearTimeout(tDone)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-slate-950 text-white select-none transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={() => {
        setFading(true)
        setTimeout(onFinish, 250)
      }}
      title={t.splashClickTitle}
    >
      {/* Background artwork */}
      <div className="absolute inset-0">
        <img
          src="/splash.jpg"
          alt=""
          className="h-full w-full object-cover object-center filter brightness-90"
        />
        {/* Cinematic dark gradients to guarantee text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-amber-300 uppercase backdrop-blur-md">
            Studio Edition
          </span>
        </div>
        <span className="text-xs font-mono font-medium tracking-wide text-slate-400/80">
          v0.1.0
        </span>
      </div>

      {/* Center / Bottom Branding */}
      <div className="relative z-10 p-8 pb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900/80 p-2.5 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
            <img src={logo} alt="OpenFolio" className="h-full w-full drop-shadow-md" />
            <div className="absolute -inset-1 rounded-2xl bg-amber-500/20 blur-md -z-10" />
          </div>
          <div>
            <h1 className="font-brand text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Open<span className="text-amber-500">Folio</span>
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-300/90">
              {t.splashSubtitle}
            </p>
          </div>
        </div>

        {/* Dynamic status line */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2 font-mono text-[11px]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            {t.splashSteps[stepIndex]}
          </span>
          <span className="text-[10px] text-slate-500">{t.splashSkip}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 shadow-sm shadow-amber-500/50 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
