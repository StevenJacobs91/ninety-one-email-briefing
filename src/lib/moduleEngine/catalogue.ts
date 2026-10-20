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
    return (await res.json()) as ThemeCatalogue
  })()
  cache.set(themeId, pending)
  pending.catch(() => cache.delete(themeId))
  return pending
}
