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
  const regionPart = regions.length > 0 ? regions.join('-') : 'TBD'
  const audiencePart = channels.length > 0 ? channels.join('-') : 'TBD'
  const namePart = campaignName || 'Untitled'
  const base = `${mm}${yy} ${regionPart} ${audiencePart} ${namePart}`
  if (emailDescription && emailDescription.trim()) {
    return `${base} - ${emailDescription.trim()}`
  }
  return base
}
