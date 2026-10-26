import type { FieldPath } from 'react-hook-form'
import type { BriefFormData } from './schema'

// The fields of the brief itself, which sit beside the email in Brief & Build. The email's own fields (headline, button and so on)
// come from the builder and are checked with the whole form when Continue is pressed.
const BRIEF_FIELDS: FieldPath<BriefFormData>[] = [
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
]

const STEP_FIELDS_BY_ID: Record<string, FieldPath<BriefFormData>[]> = {
  build: BRIEF_FIELDS,
  // The names the first two tabs had before they were joined, kept so older callers still work.
  campaign: BRIEF_FIELDS,
  content: [],
  review: [],
}

const ID_BY_INDEX = ['build', 'review']

/**
 * Returns the RHF field paths to validate for a given step.
 * Accepts either a step id string ('build' | 'review', or the older 'campaign' | 'content')
 * or a numeric index (0 | 1).
 */
export function getStepFields(stepIdOrIndex: string | number): FieldPath<BriefFormData>[] {
  const id = typeof stepIdOrIndex === 'number' ? ID_BY_INDEX[stepIdOrIndex] : stepIdOrIndex
  return STEP_FIELDS_BY_ID[id] ?? []
}
