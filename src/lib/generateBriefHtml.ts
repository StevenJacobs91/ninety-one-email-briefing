import type { BriefPayload } from '../types/brief.types'
import { BRAND_THEMES, EMAIL_TYPE_LABELS, EMAIL_MODULES } from './constants'
import type { EmailType } from './constants'
import { buildEmailName } from './emailName'

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function row(label: string, value: string): string {
  if (!value) return ''
  return `<tr><td class="label">${esc(label)}</td><td>${esc(value)}</td></tr>`
}

/**
 * Generates a standalone HTML document that mirrors the "Review your Brief" layout.
 * Used as the brief attachment when submitting via email or n8n.
 */
export function generateBriefHtml(brief: BriefPayload): string {
  const theme = BRAND_THEMES.find((t) => t.id === brief.campaign.theme)
  const primary = theme?.primary ?? '#134848'
  const accent = theme?.accent ?? '#fbaa96'
  const emailName = buildEmailName(brief.campaign.campaignName, brief.audience?.region ?? [], brief.audience?.channel ?? [], brief.campaign?.emailDescription)

  const selectedModuleLabels = (brief.content?.modules ?? [])
    .map((id) => EMAIL_MODULES.find((m) => m.id === id)?.label ?? id)

  const sectionsHtml = (brief.content?.sections ?? []).map((s, i) => `
    <div class="section-card">
      <p class="section-label">Section ${i + 1}</p>
      <p class="section-heading">${esc(s.heading)}</p>
      <p class="section-body">${esc(s.body)}</p>
      ${s.imageRequired ? `<p class="section-image">Image required${s.imageDescription ? ': ' + esc(s.imageDescription) : ''}</p>` : ''}
    </div>
  `).join('')

  const distributionListsHtml = (brief.audience?.distributionLists ?? []).length > 0
    ? row('Distribution Lists', (brief.audience?.distributionLists ?? []).map((l) => `${l.name}${l.rowCount ? ` (${l.rowCount.toLocaleString()} contacts)` : ''}`).join(', '))
    : ''

  const modulesHtml = selectedModuleLabels.length > 0
    ? `<tr><td class="label">Modules</td><td>${selectedModuleLabels.map((l) => `<span class="badge">${esc(l)}</span>`).join(' ')}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Brief — ${esc(emailName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333; background: #f5f3ee; }
    .wrapper { max-width: 760px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: ${primary}; padding: 28px 32px; }
    .header h1 { font-size: 22px; font-weight: bold; color: #fff; margin-bottom: 4px; }
    .header p { font-size: 12px; color: ${accent}; }
    .content { padding: 28px 32px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 15px; font-weight: bold; color: ${primary}; border-bottom: 2px solid ${accent}; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: .04em; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 8px; vertical-align: top; border-bottom: 1px solid #f0ece5; font-size: 13px; line-height: 1.5; }
    td.label { color: #6b6660; min-width: 160px; width: 35%; font-weight: 600; }
    .section-card { background: #f8f5ee; border-left: 3px solid ${accent}; border-radius: 4px; padding: 12px 14px; margin-bottom: 10px; }
    .section-label { font-size: 10px; text-transform: uppercase; color: #999; margin-bottom: 3px; }
    .section-heading { font-weight: bold; color: ${primary}; margin-bottom: 4px; }
    .section-body { color: #555; line-height: 1.5; }
    .section-image { font-size: 11px; color: #999; margin-top: 6px; font-style: italic; }
    .badge { display: inline-block; background: ${primary}1a; color: ${primary}; border-radius: 99px; padding: 2px 8px; font-size: 11px; margin: 2px 2px 0 0; }
    .footer { background: #f8f5ee; padding: 14px 32px; font-size: 11px; color: #999; border-top: 1px solid #e5e0d8; }
    .colour-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; margin-right: 4px; border: 1px solid rgba(0,0,0,.15); }
    @media print {
      body { background: #fff; }
      .wrapper { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Ninety One — Email Brief</h1>
      <p>${esc(emailName)}</p>
    </div>
    <div class="content">

      <div class="section">
        <p class="section-title">Campaign</p>
        <table>
          ${row('Email Type', EMAIL_TYPE_LABELS[brief.campaign.emailType as EmailType] ?? brief.campaign.emailType)}
          ${row('Campaign Name', brief.campaign.campaignName)}
          ${row('Email Name', emailName)}
          <tr>
            <td class="label">Brand Theme</td>
            <td>
              <span class="colour-swatch" style="background:${primary};"></span>
              <span class="colour-swatch" style="background:${accent};"></span>
              ${esc(theme?.label ?? brief.campaign.theme)}
            </td>
          </tr>
          ${row('Subject Line', brief.campaign.subjectLine)}
          ${row('Preview Text', brief.campaign.previewText)}
          ${row('From Name', brief.campaign.fromName)}
          ${row('From Address', brief.campaign.fromAddress)}
          ${brief.campaign.replyToEmail ? row('Reply-To', brief.campaign.replyToEmail) : ''}
        </table>
      </div>

      <div class="section">
        <p class="section-title">Audience</p>
        <table>
          ${row('Client Group', (brief.audience?.clientGroup ?? []).join(', '))}
          ${row('Regions', (brief.audience?.region ?? []).join(', '))}
          ${row('Channels', (brief.audience?.channel ?? []).join(', '))}
          ${distributionListsHtml}
          ${brief.audience?.pardotListId ? row('Pardot List ID', brief.audience.pardotListId) : ''}
        </table>
      </div>

      <div class="section">
        <p class="section-title">Assets</p>
        <table>
          ${row('Logo Variant', brief.assets?.logoVariant ?? '')}
          ${brief.assets?.stripeColour ? `<tr><td class="label">Stripe Colour</td><td><span class="colour-swatch" style="background:${esc(brief.assets.stripeColour)};"></span>${esc(brief.assets.stripeColour)}</td></tr>` : ''}
          ${brief.assets?.heroImageUrl ? row('Hero Image URL', brief.assets.heroImageUrl) : ''}
          ${brief.assets?.heroImageAlt ? row('Hero Image Alt', brief.assets.heroImageAlt) : ''}
          ${(brief.assets?.additionalAssetUrls ?? []).filter(Boolean).length > 0 ? row('Additional Assets', (brief.assets?.additionalAssetUrls ?? []).filter(Boolean).join(', ')) : ''}
          ${(brief.assets?.attachments ?? []).length > 0 ? row('Attachments', (brief.assets?.attachments ?? []).map((a) => a.name).join(', ')) : ''}
        </table>
      </div>

      <div class="section">
        <p class="section-title">Content</p>
        <table>
          ${row('Headline', brief.content?.headline ?? '')}
          ${brief.content?.subHeadline ? row('Sub-headline', brief.content.subHeadline) : ''}
          ${row('Body Intro', brief.content?.bodyIntro ?? '')}
          ${modulesHtml}
        </table>
        ${sectionsHtml}
        <table>
          ${row('CTA Label', brief.content?.cta?.label ?? '')}
          ${row('CTA URL', brief.content?.cta?.url ?? '')}
          ${brief.content?.legalDisclaimer ? row('Legal Disclaimer', brief.content.legalDisclaimer) : ''}
          ${row('Include Unsubscribe', brief.content?.includeUnsubscribe ? 'Yes' : 'No')}
        </table>
      </div>

      <div class="section">
        <p class="section-title">Deadlines</p>
        <table>
          ${row('Content Approval Date', formatDate(brief.deadlines?.contentApprovalDate ?? ''))}
          ${row('Send Date', formatDate(brief.deadlines?.sendDate ?? ''))}
          ${row('Urgency', brief.deadlines?.urgency ? brief.deadlines.urgency.charAt(0).toUpperCase() + brief.deadlines.urgency.slice(1) : '')}
          ${row('1-1 Required', brief.deadlines?.oneOnOneRequired ? 'Yes' : 'No')}
          ${brief.deadlines?.notes ? row('Notes', brief.deadlines.notes) : ''}
        </table>
      </div>

    </div>
    <div class="footer">
      Generated by Ninety One Email Briefing Form &nbsp;·&nbsp; ${new Date().toLocaleString('en-GB')}
    </div>
  </div>
</body>
</html>`
}
