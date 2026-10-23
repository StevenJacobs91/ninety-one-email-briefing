import type { BrandThemeConfig } from '../../types/settings.types'
import { loadAvailableThemes, loadCatalogue, type ThemeCatalogue } from './catalogue'

type Colours = Pick<BrandThemeConfig, 'id' | 'primary' | 'accent' | 'tint01' | 'tint02' | 'tint03'>

/**
 * The theme whose library a theme without one borrows: the first with the same primary colour. A theme that
 * has its own library, or whose primary colour no library has, borrows nothing.
 */
export function baseThemeFor(themeId: string, themes: readonly Colours[], withLibrary: readonly string[]): string | null {
  if (withLibrary.includes(themeId)) return null
  const target = themes.find((t) => t.id === themeId)
  if (!target) return null
  return withLibrary.find((id) => themes.find((t) => t.id === id)?.primary.toLowerCase() === target.primary.toLowerCase()) ?? null
}

/** The themes offered with an approximate library: those with none of their own that can borrow one. */
export function derivableThemes(themes: readonly Colours[], withLibrary: readonly string[]): string[] {
  return themes.filter((t) => baseThemeFor(t.id, themes, withLibrary) !== null).map((t) => t.id)
}

const PAIRS = ['primary', 'tint01', 'tint02', 'tint03', 'accent'] as const

/**
 * A copy of a library in another theme's colours: each colour of the borrowed theme (its accent, and any tint
 * that differs) becomes the new theme's. Neutrals such as the text grey are left alone. Images are not
 * recoloured: logos and stripes come from the theme's own settings, but small icons keep the borrowed colour.
 */
export function deriveCatalogue(base: ThemeCatalogue, from: Colours, to: Colours, themeId: string): ThemeCatalogue {
  const swaps = new Map<string, string>()
  for (const key of PAIRS) {
    const a = from[key]?.toLowerCase()
    const b = to[key]?.toLowerCase()
    if (a && b && a !== b && !swaps.has(a)) swaps.set(a, b)
  }
  const recolour = (html: string) => (swaps.size === 0 ? html : html.replace(/#[0-9a-fA-F]{6}\b/g, (hex) => swaps.get(hex.toLowerCase()) ?? hex))
  return {
    themeId,
    order: base.order,
    shell: { head: recolour(base.shell.head), tail: recolour(base.shell.tail) },
    modules: Object.fromEntries(Object.entries(base.modules).map(([name, html]) => [name, recolour(html)])),
  }
}

const derived = new Map<string, Promise<ThemeCatalogue>>()

/** A theme's library: its own if it has one, else an approximate one from the theme it can borrow from. */
export async function loadCatalogueFor(
  themeId: string,
  themes: readonly Colours[],
  withLibrary: readonly string[] | null,
  fetchImpl: typeof fetch = fetch,
): Promise<ThemeCatalogue> {
  const base = withLibrary ? baseThemeFor(themeId, themes, withLibrary) : null
  if (!base) return loadCatalogue(themeId, fetchImpl)
  const from = themes.find((t) => t.id === base)!
  const to = themes.find((t) => t.id === themeId)!
  const key = `${themeId}|${PAIRS.map((k) => to[k] ?? '').join(',')}|${base}`
  const hit = derived.get(key)
  if (hit) return hit
  const pending = loadCatalogue(base, fetchImpl).then((catalogue) => deriveCatalogue(catalogue, from, to, themeId))
  derived.set(key, pending)
  pending.catch(() => derived.delete(key))
  return pending
}

/** loadCatalogueFor, finding out for itself which themes have a library of their own. */
export async function loadLibraryFor(themeId: string, themes: readonly Colours[], fetchImpl: typeof fetch = fetch): Promise<ThemeCatalogue> {
  return loadCatalogueFor(themeId, themes, await loadAvailableThemes(fetchImpl), fetchImpl)
}
