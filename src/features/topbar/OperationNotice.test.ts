import { describe, expect, it } from 'vitest'
import { useProject } from '@/store/useProject'

describe('OperationState and OperationNotice store logic', () => {
  it('manages operation lifecycle: start, update, finish and dismiss', () => {
    const store = useProject.getState()

    expect(useProject.getState().operation).toBeNull()

    const opId = store.startOperation('save', 'Salvataggio in corso…', 'Scrittura del progetto su disco…')
    expect(opId).toBeDefined()

    const busyState = useProject.getState().operation
    expect(busyState).not.toBeNull()
    expect(busyState?.type).toBe('save')
    expect(busyState?.status).toBe('busy')
    expect(busyState?.title).toBe('Salvataggio in corso…')
    expect(busyState?.subtitle).toBe('Scrittura del progetto su disco…')

    store.finishOperation('success', 'Salvataggio completato', 'Tutte le modifiche sono state salvate', 5000)
    const successState = useProject.getState().operation
    expect(successState?.status).toBe('success')
    expect(successState?.title).toBe('Salvataggio completato')
    expect(successState?.subtitle).toBe('Tutte le modifiche sono state salvate')

    store.dismissOperation()
    expect(useProject.getState().operation).toBeNull()
  })

  it('handles export operation lifecycle with error state', () => {
    const store = useProject.getState()

    store.startOperation('export', 'Esportazione PDF in corso…')
    expect(useProject.getState().operation?.status).toBe('busy')
    expect(useProject.getState().operation?.type).toBe('export')

    store.finishOperation('error', 'Esportazione non riuscita', 'Errore durante la compilazione', 5000)
    expect(useProject.getState().operation?.status).toBe('error')
    expect(useProject.getState().operation?.title).toBe('Esportazione non riuscita')

    store.dismissOperation()
    expect(useProject.getState().operation).toBeNull()
  })
})
