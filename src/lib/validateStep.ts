import type { FieldPath } from 'react-hook-form'
import type { BriefFormData } from './schema'

const STEP_FIELDS: FieldPath<BriefFormData>[][] = [
  // Step 0 — Campaign (includes Targeting fields now shown in Campaign tab)
  [
    'audience.clientGroup',
    'audience.region',
    'audience.channel',
    'campaign.emailType',
    'campaign.campaignName',
    'campaign.theme',
    'campaign.subjectLine',
    'campaign.previewText',
    'campaign.fromName',
    'campaign.fromAddress',
    'campaign.replyToEmail',
  ],
  // Step 1 — Audience (distribution list / pardot only)
  [],
  // Step 2 — Content
  [
    'content.headline',
    'content.bodyIntro',
    'content.sections',
    'content.cta',
    'content.cta.label',
    'content.cta.url',
  ],
  // Step 3 — Assets
  [
    'assets.logoVariant',
    'assets.heroImageUrl',
    'assets.heroImageAlt',
  ],
  // Step 4 — Deadlines
  [
    'deadlines.contentApprovalDate',
    'deadlines.sendDate',
    'deadlines.urgency',
  ],
]

export function getStepFields(step: number): FieldPath<BriefFormData>[] {
  return STEP_FIELDS[step] ?? []
}
