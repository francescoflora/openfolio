import { useEffect, useRef, useState } from 'react'
import { APP_NAME, APP_AUTHOR, APP_VERSION_FALLBACK } from '@/core/appinfo'
import logo from '@/assets/logo.svg'

interface SplashScreenProps {
  onFinish: () => void
  isReady?: boolean
}

export function SplashScreen({ onFinish, isReady = true }: SplashScreenProps) {
  const [fading, setFading] = useState(false)
  const mountedAtRef = useRef(Date.now())
  const finishedRef = useRef(false)

  useEffect(() => {
    const MIN_MS = 1200 // Tempo minimo di visione piacevole senza glitch
    const MAX_MS = 2800 // Timeout massimo di sicurezza

    const triggerFinish = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      setFading(true)
      setTimeout(() => {
        onFinish()
      }, 300)
    }

    // Timeout di sicurezza: chiudi comunque se il caricamento reale richiede troppo tempo
    const safetyTimer = setTimeout(triggerFinish, MAX_MS)

    let minTimer: ReturnType<typeof setTimeout> | null = null

    if (isReady) {
      const elapsed = Date.now() - mountedAtRef.current
      const remaining = Math.max(0, MIN_MS - elapsed)
      minTimer = setTimeout(triggerFinish, remaining)
    }

    return () => {
      clearTimeout(safetyTimer)
      if (minTimer) clearTimeout(minTimer)
    }
  }, [isReady, onFinish])

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-black text-white select-none transition-opacity duration-300 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-label={APP_NAME}
    >
      {/* Background artwork */}
      <div className="absolute inset-0">
        <img
          src="/splash.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Soft dark vignette on the left to ensure 100% pitch black for typography */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      {/* 1. Title: Logo + OpenFolio - Top 54px, Left 58px */}
      <div className="absolute left-[58px] top-[54px] z-10 flex items-center gap-3.5">
        <img src={logo} alt="" className="h-[42px] w-[42px] shrink-0 drop-shadow-md" />
        <h1 className="font-brand text-[44px] font-bold leading-none tracking-[-0.02em] text-white">
          Open<span className="text-amber-500">Folio</span>
        </h1>
      </div>

      {/* 2. Version: -v 0.1.1 - Top 125px, Left 58px */}
      <div className="absolute left-[58px] top-[125px] z-10">
        <span className="font-brand text-[17px] font-medium tracking-wide text-slate-200">
          -v {APP_VERSION_FALLBACK}
        </span>
      </div>

      {/* 3. Bottom Author: Left 58px, Bottom 60px */}
      <div className="absolute left-[58px] bottom-[60px] z-10 font-brand text-[15px] tracking-[0.03em]">
        <span className="font-normal text-slate-300">{APP_AUTHOR.split(' ')[0]} </span>
        <span className="font-bold text-white">{APP_AUTHOR.split(' ').slice(1).join(' ')}</span>
      </div>
    </div>
  )
}

