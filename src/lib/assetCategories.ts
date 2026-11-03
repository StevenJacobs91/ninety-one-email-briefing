import type { AssetCategory } from '../types/settings.types'

/** The media library's categories, in the order Settings → Asset Library lists them. */
export const ASSET_CATEGORY_ORDER: readonly AssetCategory[] = ['header', 'profile', 'stripes', 'logos', 'graphics', 'images', 'gifs']

/**
 * The category "Browse … instead" moves to: the next one in the library's order after `current`, going back to the
 * first after the last. Categories with nothing in them are skipped; null when no other category has anything.
 */
export function nextAssetCategory(current: AssetCategory, withAssets: ReadonlySet<AssetCategory>): AssetCategory | null {
  const start = ASSET_CATEGORY_ORDER.indexOf(current)
  for (let step = 1; step < ASSET_CATEGORY_ORDER.length; step++) {
    const candidate = ASSET_CATEGORY_ORDER[(start + step) % ASSET_CATEGORY_ORDER.length]
    if (withAssets.has(candidate)) return candidate
  }
  return null
}
