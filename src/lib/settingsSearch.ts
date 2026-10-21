import type { AssetEntry, CampaignEntry } from '../types/settings.types'

type Part = string | null | undefined | readonly string[]

/**
 * Whether a search matches an item: every word typed must appear somewhere in the item's text, in any order,
 * ignoring case. Nothing typed matches everything.
 */
export function matchesSearch(query: string, parts: readonly Part[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = parts
    .flatMap((p) => (Array.isArray(p) ? p : [p]))
    .filter((p): p is string => typeof p === 'string' && p !== '')
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}

/** What a campaign can be found by. Pass the theme's readable name so "cape coral" works as well as the id. */
export function campaignSearchParts(c: CampaignEntry, themeLabel?: string): Part[] {
  const s = c.senderPreset
  const p = c.contentPreset
  return [
    c.name, c.regions, c.channels, c.clientGroups, c.pardotCampaignId,
    s?.fromName, s?.fromAddress, s?.replyToEmail,
    p?.theme, themeLabel, p?.subjectLine, p?.previewText, p?.headline, p?.subHeadline, p?.distributionList, p?.pardotListId,
  ]
}

const CATEGORY_NAMES: Record<AssetEntry['category'], string> = {
  header: 'Header', profile: 'Profile', stripes: 'Stripes', logos: 'Logos', graphics: 'Graphics',
}

/** What an asset can be found by. */
export function assetSearchParts(a: AssetEntry): Part[] {
  return [a.name, a.altText, a.url, a.colourOverlay, a.category, CATEGORY_NAMES[a.category]]
}
