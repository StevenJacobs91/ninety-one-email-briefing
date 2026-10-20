import { useEffect, useState } from 'react'
import { loadAvailableThemes } from '../../lib/moduleEngine/catalogue'

/** Theme ids that have a module library; null until known, or if the index is unavailable. */
export function useAvailableThemes(): string[] | null {
  const [themes, setThemes] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    loadAvailableThemes().then((t) => { if (!cancelled) setThemes(t) })
    return () => { cancelled = true }
  }, [])
  return themes
}
