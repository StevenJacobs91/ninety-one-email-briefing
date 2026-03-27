import type { BriefPayload } from '../types/brief.types'

export function downloadBriefJson(payload: BriefPayload): void {
  const slug = payload.campaign.campaignName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const date = new Date().toISOString().slice(0, 10)
  const filename = `brief-${slug}-${date}.json`

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyBriefToClipboard(payload: BriefPayload): Promise<void> {
  const json = JSON.stringify(payload, null, 2)
  await navigator.clipboard.writeText(json)
}

export function buildPrefillUrl(payload: BriefPayload, baseUrl: string): string {
  const params = new URLSearchParams()
  params.set('campaignName', payload.campaign.campaignName)
  params.set('emailType', payload.campaign.emailType)
  params.set('theme', payload.campaign.theme)
  return `${baseUrl}?${params.toString()}`
}
