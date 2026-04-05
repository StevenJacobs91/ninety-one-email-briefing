import type { FieldPath } from 'react-hook-form'
import type { BriefFormData } from './schema'

const STEP_FIELDS_BY_ID: Record<string, FieldPath<BriefFormData>[]> = {
  campaign: [
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
  content: [
    'content.headline',
    'content.bodyIntro',
    'content.sections',
    'content.cta',
    'content.cta.label',
    'content.cta.url',
  ],
  review: [],
}

const ID_BY_INDEX = ['campaign', 'content', 'review']

/**
 * Returns the RHF field paths to validate for a given step.
 * Accepts either a step id string ('campaign' | 'content' | 'review')
 * or a legacy numeric index (0 | 1 | 2).
 */
export function getStepFields(stepIdOrIndex: string | number): FieldPath<BriefFormData>[] {
  const id = typeof stepIdOrIndex === 'number' ? ID_BY_INDEX[stepIdOrIndex] : stepIdOrIndex
  return STEP_FIELDS_BY_ID[id] ?? []
}
