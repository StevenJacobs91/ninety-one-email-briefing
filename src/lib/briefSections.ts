import type { BriefFormData } from './schema'
import { briefProblems } from './briefProblems'
import { REQUIRABLE_FIELDS, type RequiredMap } from './briefRequirements'
import type { FormProblem } from './formErrors'

// The sections of the Brief panel. Each is one block of the brief's own form; the email itself ('email') is built beside it,
// and has no section of its own here, but a problem in one of its fields is still counted and can still be jumped to.
export type BriefSectionId = 'identity' | 'envelope' | 'sender' | 'targeting' | 'audience' | 'deadlines' | 'materials' | 'tags' | 'email'

interface SectionDef {
  label: string
  /** Where the section sits in the panel (theme and email type come first, as they set up the email) */
  order: number
  /** The fields counted for the badge. Sections with none are optional. */
  fields: readonly string[]
}

export const BRIEF_SECTIONS: Record<BriefSectionId, SectionDef> = {
  identity: { label: 'Email identity', order: 1, fields: ['campaign.emailType', 'campaign.theme', 'campaign.campaignName', 'campaign.emailDescription'] },
  envelope: { label: 'Message envelope', order: 2, fields: ['campaign.subjectLine', 'campaign.previewText'] },
  sender: { label: 'Sender details', order: 3, fields: ['campaign.fromName', 'campaign.fromAddress', 'campaign.replyToEmail'] },
  targeting: { label: 'Targeting', order: 4, fields: ['audience.clientGroup', 'audience.region', 'audience.channel'] },
  audience: { label: 'Audience', order: 5, fields: [] },
  deadlines: { label: 'Deadlines', order: 6, fields: ['deadlines.contentApprovalDate', 'deadlines.sendDate'] },
  materials: { label: 'Supporting material', order: 7, fields: [] },
  tags: { label: 'Tags', order: 8, fields: [] },
  email: { label: 'Email', order: 9, fields: [] },
}

const ASSET_FILES = ['assets.attachments', 'assets.additionalAssetUrls']

/** The section a field belongs to, or null for a field that is not part of the brief form or the email. */
export function sectionForField(path: string): BriefSectionId | null {
  for (const [id, def] of Object.entries(BRIEF_SECTIONS) as [BriefSectionId, SectionDef][]) {
    if (def.fields.includes(path)) return id
  }
  if (ASSET_FILES.some((f) => path === f || path.startsWith(`${f}.`))) return 'materials'
  if (path.startsWith('audience.')) return 'audience'
  if (path === 'campaign.senderType' || path === 'campaign.specificUser') return 'sender'
  if (path === 'deadlines.tags') return 'tags'
  if (path.startsWith('deadlines.')) return 'deadlines'
  if (path.startsWith('campaign.')) return 'identity'
  if (path.startsWith('content.') || path.startsWith('assets.') || path.startsWith('htmlEdits')) return 'email'
  return null
}

export interface SectionProgress {
  /** Fields with nothing wrong */
  done: number
  total: number
  /** Everything wrong in the section, from the whole brief's check, including fields the badge does not count */
  problems: FormProblem[]
}

/** How far along each section is, read from the schema's check of the brief so it matches what Continue will say. */
export function sectionProgress(values: BriefFormData, required?: RequiredMap, hidden?: ReadonlySet<string>): Record<BriefSectionId, SectionProgress> {
  const problems = briefProblems(values, required, hidden)
  const failing = new Set(problems.map((p) => p.path))
  const out = {} as Record<BriefSectionId, SectionProgress>
  for (const id of Object.keys(BRIEF_SECTIONS) as BriefSectionId[]) {
    // The badge counts the section's own fields, plus any the team has made required that it would not count otherwise.
    const base = BRIEF_SECTIONS[id].fields
    // A field switched off in Settings is not on the form, so it does not count.
    const fields = [...base, ...(required ? (REQUIRABLE_FIELDS[id] ?? []).filter((f) => required[f.path] && !base.includes(f.path)).map((f) => f.path) : [])].filter((f) => !hidden?.has(f))
    out[id] = {
      total: fields.length,
      done: fields.filter((f) => !failing.has(f)).length,
      problems: problems.filter((p) => sectionForField(p.path) === id),
    }
  }
  return out
}
