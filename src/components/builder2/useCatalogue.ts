import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { withCustomLibrary } from '../../lib/moduleEngine/seed'
import type { ThemeCatalogue } from '../../lib/moduleEngine/catalogue'
import { loadLibraryFor } from '../../lib/moduleEngine/deriveTheme'

type State =
  | { status: 'loading' }
  | { status: 'ready'; catalogue: ThemeCatalogue }
  | { status: 'error'; message: string }

export function useCatalogue(themeId: string): State & { retry: () => void } {
  const { settings } = useSettings()
  const [loaded, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadLibraryFor(themeId, settings.brandThemes ?? [])
      .then((catalogue) => { if (!cancelled) setState({ status: 'ready', catalogue }) })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the module library' })
      })
    return () => { cancelled = true }
  }, [themeId, attempt, settings.brandThemes])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  // Modules added in Settings → Email Modules join the library, in this theme's colours.
  const state = useMemo<State>(
    () => (loaded.status === 'ready' ? { status: 'ready', catalogue: withCustomLibrary(loaded.catalogue, settings) } : loaded),
    [loaded, settings],
  )
  return { ...state, retry }
}
