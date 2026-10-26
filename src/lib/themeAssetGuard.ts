import type { BrandThemeConfig } from '../types/settings.types'

const URL_KEYS = ['logoUrl', 'stripeUrl', 'slimStripeUrl', 'footerLogoUrl', 'anniversaryLogoUrl'] as const

const empty = (v: string | undefined) => !v || v.trim() === ''

/**
 * Settings are saved as one whole object, so a session that never saw a theme's image URLs (it started on the built-in
 * defaults, or loaded before someone else saved them) would write empty ones over them. Before saving, a URL that is empty
 * here, was empty when this session loaded, and is filled in what is stored now, is taken from what is stored. A URL cleared
 * on purpose (it had a value at load) stays cleared, and one changed here is kept. Themes someone else added since are kept;
 * ones removed here on purpose stay removed.
 */
export function protectThemeAssets(
  local: BrandThemeConfig[],
  loaded: BrandThemeConfig[],
  remote: BrandThemeConfig[],
): { themes: BrandThemeConfig[]; restored: number } {
  let restored = 0
  const loadedById = new Map(loaded.map((t) => [t.id, t]))
  const remoteById = new Map(remote.map((t) => [t.id, t]))

  const themes = local.map((theme) => {
    const stored = remoteById.get(theme.id)
    if (!stored) return theme
    const seen = loadedById.get(theme.id)
    const next: BrandThemeConfig = { ...theme }

    for (const key of URL_KEYS) {
      if (empty(theme[key]) && empty(seen?.[key]) && !empty(stored[key])) {
        next[key] = stored[key]
        restored++
      }
    }

    const icons = { ...(theme.iconUrls ?? {}) }
    let iconsChanged = false
    for (const [key, url] of Object.entries(stored.iconUrls ?? {})) {
      if (empty(icons[key]) && empty(seen?.iconUrls?.[key]) && !empty(url)) {
        icons[key] = url
        iconsChanged = true
        restored++
      }
    }
    if (iconsChanged) next.iconUrls = icons
    return next
  })

  // A theme added by someone else since this session loaded is not ours to delete.
  for (const stored of remote) {
    if (!loadedById.has(stored.id) && !local.some((t) => t.id === stored.id)) themes.push(stored)
  }
  return { themes, restored }
}
