import type { BriefPayload } from '../types/brief.types'
import { BRAND_THEMES, EMAIL_TYPE_LABELS, EMAIL_MODULES } from './constants'
import type { EmailType } from './constants'
import { buildEmailName } from './emailName'
import { appendUtm } from './utm'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * Generates a plain-text version of the email from a brief payload.
 * Suitable for the text-only alternate part of a multipart email.
 */
export function generateTextEmail(brief: BriefPayload): string {
  const theme = BRAND_THEMES.find((t) => t.id === brief.campaign.theme)
  const campaignName = brief.campaign.campaignName ?? ''
  const ctaUrl = appendUtm(brief.content?.cta?.url ?? '', campaignName)

  const selectedModuleLabels = (brief.content?.modules ?? [])
    .map((id) => EMAIL_MODULES.find((m) => m.id === id)?.label ?? id)

  const divider = '─'.repeat(60)

  const sections = (brief.content?.sections ?? []).map((s, i) => [
    `[Section ${i + 1}] ${s.heading}`,
    s.body,
    s.imageRequired ? `[Image required${s.imageDescription ? ': ' + s.imageDescription : ''}]` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const distributionInfo = (brief.audience?.distributionLists ?? []).length > 0
    ? `Distribution Lists: ${(brief.audience?.distributionLists ?? []).map((l) => `${l.name}${l.rowCount ? ` (${l.rowCount.toLocaleString()} contacts)` : ''}`).join(', ')}`
    : ''

  const lines: string[] = [
    `NINETY ONE — EMAIL BRIEF`,
    `${buildEmailName(campaignName, brief.audience?.region ?? [], brief.audience?.channel ?? [])}`,
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    divider,
    '',
    `CAMPAIGN`,
    `Email Type:    ${EMAIL_TYPE_LABELS[brief.campaign.emailType as EmailType] ?? brief.campaign.emailType}`,
    `Campaign:      ${campaignName}`,
    `Theme:         ${theme?.label ?? brief.campaign.theme}`,
    `Subject Line:  ${brief.campaign.subjectLine}`,
    `Preview Text:  ${brief.campaign.previewText}`,
    `From:          ${brief.campaign.fromName} <${brief.campaign.fromAddress}>`,
    brief.campaign.replyToEmail ? `Reply-To:      ${brief.campaign.replyToEmail}` : '',
    '',
    divider,
    '',
    `AUDIENCE`,
    `Client Group:  ${(brief.audience?.clientGroup ?? []).join(', ')}`,
    `Regions:       ${(brief.audience?.region ?? []).join(', ')}`,
    `Channels:      ${(brief.audience?.channel ?? []).join(', ')}`,
    distributionInfo,
    brief.audience?.pardotListId ? `Pardot List:   ${brief.audience.pardotListId}` : '',
    '',
    divider,
    '',
    `ASSETS`,
    `Logo Variant:  ${brief.assets?.logoVariant ?? ''}`,
    brief.assets?.stripeColour ? `Stripe Colour: ${brief.assets.stripeColour}` : '',
    brief.assets?.heroImageUrl ? `Hero Image:    ${brief.assets.heroImageUrl}` : '',
    brief.assets?.heroImageAlt ? `Hero Alt Text: ${brief.assets.heroImageAlt}` : '',
    ...(brief.assets?.additionalAssetUrls ?? []).filter(Boolean).map((u, i) => `Asset URL ${i + 1}: ${u}`),
    ...(brief.assets?.attachments ?? []).map((a) => `Attachment:    ${a.name}`),
    '',
    divider,
    '',
    `CONTENT`,
    '',
    brief.content?.headline ? `${brief.content.headline.toUpperCase()}` : '',
    brief.content?.subHeadline ? brief.content.subHeadline : '',
    '',
    stripHtml(brief.content?.bodyIntro ?? ''),
    '',
    selectedModuleLabels.length > 0 ? `Modules: ${selectedModuleLabels.join(', ')}` : '',
    '',
    sections,
    '',
    divider,
    '',
    `CALL TO ACTION`,
    `${brief.content?.cta?.label ?? ''}`,
    ctaUrl,
    '',
    brief.content?.legalDisclaimer ? `DISCLAIMER\n${brief.content.legalDisclaimer}` : '',
    '',
    divider,
    '',
    `DEADLINES`,
    `Content Approval: ${formatDate(brief.deadlines?.contentApprovalDate ?? '')}`,
    `Send Date:        ${formatDate(brief.deadlines?.sendDate ?? '')}`,
    `Urgency:          ${brief.deadlines?.urgency ?? ''}`,
    `1-1 Required:     ${brief.deadlines?.oneOnOneRequired ? 'Yes' : 'No'}`,
    brief.deadlines?.notes ? `Notes:\n${brief.deadlines.notes}` : '',
    '',
    divider,
    `Ninety One Email Briefing Form`,
  ]

  return lines.filter((l) => l !== '').join('\n').replace(/\n{3,}/g, '\n\n')
}
