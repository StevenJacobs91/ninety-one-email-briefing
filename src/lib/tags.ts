import type { BriefFormData } from './schema'
import type { BrandThemeConfig } from '../types/settings.types'

// The tag string pasted into the email marketing platform.
export function buildTags(data: BriefFormData, themes: Pick<BrandThemeConfig, 'id' | 'label'>[] = [], now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const regionPart = (data.audience.region ?? []).length > 0 ? (data.audience.region ?? []).join(' ') : 'tbd'
  const audiencePart = (data.audience.channel ?? []).length > 0 ? (data.audience.channel ?? []).join(' ') : 'tbd'
  const namePart = data.campaign.campaignName || 'untitled'
  const emailName = `${mm}${yy} ${regionPart} ${audiencePart} ${namePart}`.toLowerCase()

  const themeLabel = themes.find((t) => t.id === data.campaign.theme)?.label ?? data.campaign.theme ?? ''

  return [
    `parent - ${emailName}`,
    'email - primary',
    `client group - ${(data.audience.clientGroup ?? []).join(' ').toLowerCase()}`,
    `region - ${(data.audience.region ?? []).join(' ').toLowerCase()}`,
    `audience - ${(data.audience.channel ?? []).join(' ').toLowerCase()}`,
    `campaign - ${(data.campaign.campaignName || 'untitled').toLowerCase()}`,
    `email type - ${(data.campaign.emailType || '').toLowerCase()}`,
    `colour theme - ${themeLabel.toLowerCase().replace(/\s*\/\s*/g, ' and ')}`,
  ].join(', ')
}

