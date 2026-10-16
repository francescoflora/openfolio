import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { useProject } from '@/store/useProject'
import { cn } from '@/lib/cn'

export function OperationNotice() {
  const operation = useProject((s) => s.operation)
  const dismiss = useProject((s) => s.dismissOperation)

  if (!operation) return null

  const isBusy = operation.status === 'busy'
  const isSuccess = operation.status === 'success'
  const isError = operation.status === 'error'

  return (
    <>
      {/* Barra superiore ad alto contrasto per indicare attività in corso */}
      {isBusy && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-accent/25 pointer-events-none">
          <div className="h-full bg-accent animate-indeterminate-progress shadow-xs" />
        </div>
      )}

      {/* Scheda flottante di notifica operazione con barra di caricamento */}
      <div
        className={cn(
          'fixed bottom-8 right-6 z-50 flex w-88 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3',
          'bg-surface/95 text-ink border-border/80',
          isSuccess && 'border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/20',
          isError && 'border-rose-500/50 shadow-rose-500/10 ring-1 ring-rose-500/20',
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
              isBusy && 'bg-accent/15 text-accent',
              isSuccess && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              isError && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
            )}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold leading-tight text-ink truncate">
                {operation.title}
              </h4>
              <button
                type="button"
                onClick={dismiss}
                className="text-ink-soft hover:text-ink -mr-1 -mt-1 p-1 rounded transition hover:bg-surface-2 cursor-pointer"
                title="Chiudi avviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {operation.subtitle && (
              <p className="mt-0.5 text-[11px] text-ink-soft leading-tight truncate">
                {operation.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Barra di caricamento e progresso */}
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2 border border-border/60">
          {isBusy ? (
            <div className="h-full rounded-full bg-accent animate-indeterminate-progress" />
          ) : isSuccess ? (
            <div className="h-full w-full rounded-full bg-emerald-500 transition-all duration-300" />
          ) : (
            <div className="h-full w-full rounded-full bg-rose-500 transition-all duration-300" />
          )}
        </div>
      </div>
    </>
  )
}
