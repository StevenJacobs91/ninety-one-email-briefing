import { useEffect, useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { loadAvailableThemes } from '../../lib/moduleEngine/catalogue'
import { derivableThemes } from '../../lib/moduleEngine/deriveTheme'

/**
 * Theme ids that can be built: those with a module library, and those that can borrow one (an approximate library).
 * `ids` is null until known, or if the index is unavailable.
 */
export function useAvailableThemes(): { ids: string[] | null; approximate: string[] } {
  const { settings } = useSettings()
  const [own, setOwn] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadAvailableThemes().then((t) => { if (!cancelled) setOwn(t) })
    return () => { cancelled = true }
  }, [])
  if (!own) return { ids: null, approximate: [] }
  const approximate = derivableThemes(settings.brandThemes ?? [], own)
  return { ids: [...own, ...approximate], approximate }
}
