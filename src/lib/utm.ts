/**
 * Appends UTM tracking parameters to a URL.
 * Preserves any existing query parameters.
 */
export function appendUtm(url: string, campaignName: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    u.searchParams.set('utm_medium', 'email')
    u.searchParams.set('utm_source', 'pardot')
    u.searchParams.set('utm_campaign', campaignName)
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
