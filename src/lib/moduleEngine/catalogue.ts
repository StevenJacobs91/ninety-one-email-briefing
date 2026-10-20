export interface ThemeCatalogue {
  themeId: string
  shell: { head: string; tail: string }
  order: string[]
  modules: Record<string, string>
}

export function themeFolderName(label: string): string {
  return label.replace(/\s*\/\s*/g, ' ')
}

const cache = new Map<string, Promise<ThemeCatalogue>>()

export function clearCatalogueCache(): void {
  cache.clear()
}

export function loadCatalogue(themeId: string, fetchImpl: typeof fetch = fetch): Promise<ThemeCatalogue> {
  const hit = cache.get(themeId)
  if (hit) return hit
  const pending = (async () => {
    const res = await fetchImpl(`/module-catalogue/${themeId}.json`)
    if (!res.ok) throw new Error(`Could not load the module library for theme "${themeId}" (HTTP ${res.status})`)
    // A theme with no catalogue falls through to the app's HTML page, not a 404.
    try {
      return JSON.parse(await res.text()) as ThemeCatalogue
    } catch {
      throw new Error(`There is no module library for the theme "${themeId}" yet. Choose another theme on the Campaign tab.`)
    }
  })()
  cache.set(themeId, pending)
  pending.catch(() => cache.delete(themeId))
  return pending
}

/** Theme ids that have a module library, or null if the index cannot be read. */
export async function loadAvailableThemes(fetchImpl: typeof fetch = fetch): Promise<string[] | null> {
  try {
    const res = await fetchImpl('/module-catalogue/index.json')
    if (!res.ok) return null
    const parsed = JSON.parse(await res.text()) as { themes?: string[] }
    return Array.isArray(parsed.themes) ? parsed.themes : null
  } catch {
    return null
  }
}
