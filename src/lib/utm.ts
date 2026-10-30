/**
 * A campaign name as it goes in a link: lower case, with hyphens between the words ("women-and-investing-newsletter"),
 * never "+" or "%20". Anything that is not a letter, digit, hyphen, underscore or dot becomes a hyphen.
 */
export function slugifyUtm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.~-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** What a campaign puts in the UTM field: the one set for it in Settings if there is one, else its name. Either way, as a slug. */
export function campaignUtm(campaign: { name: string; utmCampaign?: string }): string {
  return slugifyUtm(campaign.utmCampaign?.trim() || campaign.name)
}

/**
 * Appends UTM tracking parameters to a URL.
 * Preserves any existing query parameters.
 */
export function appendUtm(url: string, campaignName: string): string {
  if (!url) return url
  try {
    // A URL read out of HTML, or pasted from it, can carry "&amp;" for "&"; left alone it parses as a parameter named "amp;utm_medium".
    const u = new URL(url.replace(/&amp;/gi, '&'))
    u.searchParams.set('utm_medium', 'email')
    u.searchParams.set('utm_source', 'pardot')
    const campaign = slugifyUtm(campaignName)
    if (campaign) u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    // Not a valid absolute URL — return as-is
    return url
  }
}

/**
 * Applies UTM parameters to every http/https href in an HTML string.
 */
export function applyUtmToHtml(html: string, campaignName: string): string {
  if (!html || !campaignName) return html
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    return `href="${appendUtm(url, campaignName)}"`
  })
}
