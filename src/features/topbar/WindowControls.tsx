import { useEffect, useState } from 'react'
import { isTauri } from '@/core/persistence'
import { toggleWindowMaximize } from '@/core/windowSize'
import { cn } from '@/lib/cn'

interface WindowControlsProps {
  className?: string
}

export function WindowControls({ className }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isTauri()) return

    let cancelled = false
    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      if (cancelled) return
      const win = getCurrentWindow()
      const max = await win.isMaximized().catch(() => false)
      if (!cancelled) setIsMaximized(max)

      unlisten = await win.onResized(async () => {
        const m = await win.isMaximized().catch(() => false)
        if (!cancelled) setIsMaximized(m)
      }).catch(() => undefined)
    })

    return () => {
      cancelled = true
      if (unlisten) unlisten()
    }
  }, [])

  if (!isTauri()) return null

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().minimize()
    } catch (err) {
      console.warn('Failed to minimize window', err)
    }
  }

  const handleToggleMaximize = async () => {
    await toggleWindowMaximize()
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const max = await getCurrentWindow().isMaximized().catch(() => false)
      setIsMaximized(max)
    } catch {
      /* ignore */
    }
  }

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    } catch (err) {
      console.warn('Failed to close window', err)
    }
  }

  return (
    <div
      className={cn('flex h-full items-stretch shrink-0 select-none ml-1', className)}
      data-tauri-drag-region="false"
    >
      {/* Riduci a icona */}
      <button
        type="button"
        className="flex w-11 h-full items-center justify-center text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
        onClick={handleMinimize}
        title="Riduci a icona"
        tabIndex={-1}
      >
        <svg
          className="w-[10px] h-[10px]"
          viewBox="0 0 10 10"
          fill="none"
          style={{ shapeRendering: 'geometricPrecision' }}
        >
          <line x1="0.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </button>

      {/* Ingrandisci / Ripristina */}
      <button
        type="button"
        className="flex w-11 h-full items-center justify-center text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
        onClick={handleToggleMaximize}
        title={isMaximized ? 'Ripristina' : 'Ingrandisci'}
        tabIndex={-1}
      >
        {isMaximized ? (
          <svg
            className="w-[10px] h-[10px]"
            viewBox="0 0 10 10"
            fill="none"
            style={{ shapeRendering: 'geometricPrecision' }}
          >
            <rect
              x="0.5"
              y="2.5"
              width="7"
              height="7"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.5 2.5V1.5A1.5 1.5 0 0 1 4 0.5h4.5A1.5 1.5 0 0 1 10 2v4.5a1.5 1.5 0 0 1-1.5 1.5H7.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            className="w-[10px] h-[10px]"
            viewBox="0 0 10 10"
            fill="none"
            style={{ shapeRendering: 'geometricPrecision' }}
          >
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Chiudi */}
      <button
        type="button"
        className="flex w-11 h-full items-center justify-center text-ink-soft hover:bg-[#e81123] hover:text-white active:bg-[#bf0f1d] transition-colors cursor-pointer"
        onClick={handleClose}
        title="Chiudi"
        tabIndex={-1}
      >
        <svg
          className="w-[10px] h-[10px]"
          viewBox="0 0 10 10"
          fill="none"
          style={{ shapeRendering: 'geometricPrecision' }}
        >
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
