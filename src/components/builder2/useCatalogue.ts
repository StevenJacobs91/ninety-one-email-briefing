import { useCallback, useEffect, useState } from 'react'
import { loadCatalogue, type ThemeCatalogue } from '../../lib/moduleEngine/catalogue'

type State =
  | { status: 'loading' }
  | { status: 'ready'; catalogue: ThemeCatalogue }
  | { status: 'error'; message: string }

export function useCatalogue(themeId: string): State & { retry: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadCatalogue(themeId)
      .then((catalogue) => { if (!cancelled) setState({ status: 'ready', catalogue }) })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the module library' })
      })
    return () => { cancelled = true }
  }, [themeId, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
