/** Regions that are written short in an email name: "South Africa" is "SA". Only an exact match, never "Southern Africa". */
const SHORT_REGIONS: Record<string, string> = { 'south africa': 'SA' }

export function abbreviateRegion(region: string): string {
  return SHORT_REGIONS[region.trim().toLowerCase()] ?? region
}

/**
 * Builds the standardised email name:
 * MMYY REGION AUDIENCE CAMPAIGN - EMAIL DESCRIPTION
 */
export function buildEmailName(
  campaignName: string,
  regions: string[],
  channels: string[],
  emailDescription?: string
): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const regionPart = regions.length > 0 ? regions.map(abbreviateRegion).join('-') : 'TBD'
  const audiencePart = channels.length > 0 ? channels.join('-') : 'TBD'
  const namePart = campaignName || 'Untitled'
  const base = `${mm}${yy} ${regionPart} ${audiencePart} ${namePart}`
  if (emailDescription && emailDescription.trim()) {
    return `${base} - ${emailDescription.trim()}`
  }
  return base
}
