import type { BriefFormData } from '../../lib/schema'
import { BRAND_THEMES, EMAIL_TYPE_LABELS, EMAIL_MODULES } from '../../lib/constants'
import type { EmailType } from '../../lib/constants'
import { buildEmailName } from '../../lib/emailName'

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface BriefSummaryProps {
  data: BriefFormData
}

export function BriefSummary({ data }: BriefSummaryProps) {
  const theme = BRAND_THEMES.find((t) => t.id === data.campaign.theme)
  const selectedModuleLabels = (data.content.modules ?? [])
    .map((id) => EMAIL_MODULES.find((m) => m.id === id)?.label ?? id)
  const emailName = buildEmailName(data.campaign.campaignName, data.audience?.region ?? [], data.audience?.channel ?? [])

  return (
    <div className="space-y-6 text-sm">
      <Section title="Campaign">
        <Row label="Email Type" value={EMAIL_TYPE_LABELS[data.campaign.emailType as EmailType]} />
        <Row label="Campaign Name" value={data.campaign.campaignName} />
        <Row label="Email Name" value={emailName} />
        <Row label="Theme" value={theme?.label ?? data.campaign.theme} />
        <Row label="Subject Line" value={data.campaign.subjectLine} />
        <Row label="Preview Text" value={data.campaign.previewText} />
        <Row label="From Name" value={data.campaign.fromName} />
        <Row label="From Address" value={data.campaign.fromAddress} />
        {data.campaign.replyToEmail && <Row label="Reply-To" value={data.campaign.replyToEmail} />}
      </Section>

      <Section title="Audience">
        <Row label="Client Group" value={data.audience.clientGroup.join(', ')} />
        <Row label="Regions" value={data.audience.region.join(', ')} />
        <Row label="Channels" value={data.audience.channel.join(', ')} />
        {data.audience.distributionList && <Row label="Distribution List" value={`${data.audience.distributionList.name} (${Math.round(data.audience.distributionList.size / 1024)} KB)`} />}
        {data.audience.pardotListId && <Row label="Pardot List ID" value={data.audience.pardotListId} />}
      </Section>

      <Section title="Content">
        <Row label="Headline" value={data.content.headline} />
        <Row label="Body Intro" value={data.content.bodyIntro} />
        {selectedModuleLabels.length > 0 && (
          <div className="mt-2">
            <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Modules ({selectedModuleLabels.length})</p>
            <div className="flex flex-wrap gap-1.5 ml-3">
              {selectedModuleLabels.map((label) => (
                <span key={label} className="text-xs bg-[#134848]/10 dark:bg-[#134848]/20 text-[#134848] dark:text-[#fbaa96] px-2 py-0.5 rounded-full">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-2">
          <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Sections ({data.content.sections.length})</p>
          {data.content.sections.map((s, i) => (
            <div key={s.id} className="ml-3 mb-2 border-l-2 border-gray-200 pl-3">
              <p className="font-medium">{s.heading || `Section ${i + 1}`}</p>
              <p className="text-gray-500 line-clamp-2">{s.body}</p>
              {s.imageRequired && <p className="text-xs text-gray-400 mt-0.5">Image required{s.imageDescription ? `: ${s.imageDescription}` : ''}</p>}
            </div>
          ))}
        </div>
        <Row label="CTA Label" value={data.content.cta.label} />
        <Row label="CTA URL" value={data.content.cta.url} />
        {data.content.legalDisclaimer && <Row label="Legal Disclaimer" value={data.content.legalDisclaimer} />}
        <Row label="Include Unsubscribe" value={data.content.includeUnsubscribe ? 'Yes' : 'No'} />
      </Section>

      <Section title="Assets">
        <Row label="Logo Variant" value={data.assets.logoVariant} />
        {data.assets.stripeColour && <Row label="Stripe Colour" value={data.assets.stripeColour} />}
        {data.assets.heroImageUrl && <Row label="Hero Image URL" value={data.assets.heroImageUrl} />}
        {data.assets.heroImageAlt && <Row label="Hero Image Alt" value={data.assets.heroImageAlt} />}
        {data.assets.additionalAssetUrls.length > 0 && (
          <Row label="Additional Assets" value={data.assets.additionalAssetUrls.join(', ')} />
        )}
        {data.assets.attachments?.length > 0 && (
          <Row label="Attachments" value={data.assets.attachments.map((a) => a.name).join(', ')} />
        )}
      </Section>

      <Section title="Deadlines">
        <Row label="Content Approval Date" value={formatDate(data.deadlines.contentApprovalDate)} />
        <Row label="Send Date" value={formatDate(data.deadlines.sendDate)} />
        <Row label="Urgency" value={capitalize(data.deadlines.urgency)} />
        <Row label="1-1 Required" value={data.deadlines.oneOnOneRequired ? 'Yes' : 'No'} />
        {data.deadlines.notes && <Row label="Notes" value={data.deadlines.notes} />}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-[#134848] dark:text-[#fbaa96] border-b border-gray-200 dark:border-gray-700 pb-1 mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 dark:text-gray-400 min-w-[140px] shrink-0">{label}:</span>
      <span className="text-gray-900 dark:text-gray-200 break-all">{value}</span>
    </div>
  )
}
