import type { FieldPath } from 'react-hook-form'
import type { BriefFormData } from './schema'

const STEP_FIELDS: FieldPath<BriefFormData>[][] = [
  // Step 0 — Campaign (includes Targeting, Audience, Assets, and Deadlines fields)
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
    'assets.logoVariant',
    'assets.heroImageUrl',
    'assets.heroImageAlt',
    'deadlines.contentApprovalDate',
    'deadlines.sendDate',
    'deadlines.urgency',
  ],
  // Step 1 — Content
  [
    'content.headline',
    'content.bodyIntro',
    'content.sections',
    'content.cta',
    'content.cta.label',
    'content.cta.url',
  ],
  // Step 2 — Review (no required fields to validate before proceeding)
  [],
]

export function getStepFields(step: number): FieldPath<BriefFormData>[] {
  return STEP_FIELDS[step] ?? []
}
