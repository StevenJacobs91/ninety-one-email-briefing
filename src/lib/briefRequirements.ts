import type { ZodIssue } from 'zod'
import type { BriefSectionId } from './briefSections'

export interface RequirableField {
  path: string
  label: string
  /** What the brief's schema requires today; Settings can change it for the team */
  defaultRequired: boolean
}

/**
 * Which fields Settings can switch between required and optional, grouped by the section they sit in. Only fields the
 * requester fills in on the form are offered: the Pardot list ID, approval date and tags are set elsewhere or generated.
 */
export const REQUIRABLE_FIELDS: Partial<Record<BriefSectionId, RequirableField[]>> = {
  identity: [
    { path: 'campaign.emailType', label: 'Email type', defaultRequired: true },
    { path: 'campaign.theme', label: 'Brand theme', defaultRequired: true },
    { path: 'campaign.campaignName', label: 'Campaign', defaultRequired: true },
    { path: 'campaign.emailDescription', label: 'Email description', defaultRequired: false },
    { path: 'campaign.utmCampaign', label: 'UTM campaign', defaultRequired: false },
  ],
  envelope: [
    { path: 'campaign.subjectLine', label: 'Subject line', defaultRequired: true },
    { path: 'campaign.previewText', label: 'Preview text', defaultRequired: true },
  ],
  sender: [
    { path: 'campaign.fromName', label: 'From name', defaultRequired: true },
    { path: 'campaign.fromAddress', label: 'From address', defaultRequired: true },
    { path: 'campaign.replyToEmail', label: 'Reply-to email', defaultRequired: false },
  ],
  targeting: [
    { path: 'audience.clientGroup', label: 'Client group', defaultRequired: true },
    { path: 'audience.region', label: 'Region', defaultRequired: true },
    { path: 'audience.channel', label: 'Channel / audience', defaultRequired: true },
  ],
  deadlines: [
    { path: 'deadlines.sendDate', label: 'Send date', defaultRequired: true },
    { path: 'deadlines.notes', label: 'Notes', defaultRequired: false },
  ],
}

/** Field path to whether it is required. */
export type RequiredMap = Record<string, boolean>

const ALL_FIELDS: RequirableField[] = Object.values(REQUIRABLE_FIELDS).flat()
const LABELS = new Map<string, string>([...ALL_FIELDS.map((f) => [f.path, f.label] as [string, string]), ['campaign.specificUser', 'Specific user']])

export function defaultRequiredMap(): RequiredMap {
  return Object.fromEntries(ALL_FIELDS.map((f) => [f.path, f.defaultRequired]))
}

/** The team's choices laid over the defaults. A saved choice for a field that no longer exists is dropped. */
export function resolveRequired(saved: Record<string, boolean> | undefined): RequiredMap {
  const map = defaultRequiredMap()
  for (const [path, value] of Object.entries(saved ?? {})) {
    if (path in map && typeof value === 'boolean') map[path] = value
  }
  return map
}

/** Nothing typed, nothing chosen: the same test the schema's own "required" rules come down to. */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function valueAt(values: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), values)
}

/**
 * The schema's problems, adjusted for what the team has set. A field made optional loses its problem while it is empty (a
 * value that is there and wrong is still wrong); a field made required gets one when it is empty.
 */
/**
 * Who the email is sent as decides which sender fields count. A general user send needs a from name and address; a specific
 * user send needs the user instead; an assigned user send comes from the prospect's own user, so it needs none of them.
 */
function withSenderRules(required: RequiredMap, senderType: unknown): RequiredMap {
  if (senderType === 'specific') return { ...required, 'campaign.fromName': false, 'campaign.fromAddress': false, 'campaign.specificUser': true }
  if (senderType === 'assigned') return { ...required, 'campaign.fromName': false, 'campaign.fromAddress': false, 'campaign.specificUser': false }
  return { ...required, 'campaign.specificUser': false }
}

export function applyRequirements(issues: ZodIssue[], values: unknown, teamRequired: RequiredMap, hidden?: ReadonlySet<string>): ZodIssue[] {
  const rules = withSenderRules(teamRequired, valueAt(values, 'campaign.senderType'))
  // A field switched off in Settings is not on the form, so it is never asked for and nothing in it can block, whatever
  // was left in it: there would be nowhere to fix it.
  const required = hidden && hidden.size > 0 ? { ...rules, ...Object.fromEntries([...hidden].map((path) => [path, false])) } : rules
  const kept = issues.filter((issue) => {
    const path = issue.path.join('.')
    if (hidden?.has(path)) return false
    return !(required[path] === false && isEmptyValue(valueAt(values, path)))
  })
  const reported = new Set(kept.map((i) => i.path.join('.')))
  const added: ZodIssue[] = []
  for (const [path, isRequired] of Object.entries(required)) {
    if (!isRequired || reported.has(path) || !isEmptyValue(valueAt(values, path))) continue
    added.push({ code: 'custom', path: path.split('.'), message: `${LABELS.get(path) ?? path} is required` })
  }
  return [...kept, ...added]
}
