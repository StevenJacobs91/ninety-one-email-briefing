import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BriefPayload } from '../../types/brief.types'
import type { ThemeCatalogue } from '../../lib/moduleEngine/catalogue'
import { loadLibraryFor } from '../../lib/moduleEngine/deriveTheme'
import { useSettings } from '../../contexts/SettingsContext'
import { fetchBriefById } from '../../lib/supabaseQueries'
import { generateEmailHtml } from '../../lib/emailGenerator'
import { withCustomLibrary } from '../../lib/moduleEngine/seed'

export type CardEmail =
  | { status: 'loading' }
  | { status: 'loading-library' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'library-error'; message: string; retry: () => void }
  | { status: 'unbuildable' }
  | { status: 'ready'; html: string }

type Library = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; catalogue: ThemeCatalogue } | { status: 'error'; message: string }

/**
 * The email behind a board card, built from its saved brief with the same generator as the Email HTML link. It runs
 * only for the card whose drawer is open. An email built from the module library also loads that theme's library;
 * an older brief that was not, never does.
 */
export function useCardEmail(briefId: string, version = 0): CardEmail {
  const { settings } = useSettings()
  const [brief, setBrief] = useState<BriefPayload | null | undefined>(undefined)
  const [loadError, setLoadError] = useState('')
  const [library, setLibrary] = useState<Library>({ status: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setBrief(undefined)
    setLoadError('')
    setLibrary({ status: 'idle' })
    fetchBriefById(briefId)
      .then((b) => { if (!cancelled) setBrief(b) })
      .catch((e: unknown) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load the email') })
    return () => { cancelled = true }
    // `version` changes when the brief was edited, so it is read again.
  }, [briefId, version])

  const needsLibrary = !!brief?.content.build
  const theme = brief?.campaign.theme
  useEffect(() => {
    if (!needsLibrary || !theme) return
    let cancelled = false
    setLibrary({ status: 'loading' })
    loadLibraryFor(theme, settings.brandThemes ?? [])
      .then((catalogue) => { if (!cancelled) setLibrary({ status: 'ready', catalogue }) })
      .catch((e: unknown) => { if (!cancelled) setLibrary({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the module library' }) })
    return () => { cancelled = true }
  }, [needsLibrary, theme, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const catalogue = useMemo(
    () => (library.status === 'ready' ? withCustomLibrary(library.catalogue, settings) : undefined),
    [library, settings],
  )
  const built = useMemo(() => {
    if (!brief || (needsLibrary && !catalogue)) return null
    try {
      return generateEmailHtml(brief, settings, { catalogue }) || ''
    } catch {
      return ''
    }
  }, [brief, needsLibrary, catalogue, settings])

  if (loadError) return { status: 'error', message: loadError }
  if (brief === undefined) return { status: 'loading' }
  if (brief === null) return { status: 'missing' }
  if (needsLibrary && library.status === 'error') return { status: 'library-error', message: library.message, retry }
  if (needsLibrary && !catalogue) return { status: 'loading-library' }
  if (!built) return { status: 'unbuildable' }
  return { status: 'ready', html: built }
}
