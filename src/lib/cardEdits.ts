import type { BriefPayload } from '../types/brief.types'
import type { KanbanCard, KanbanColumn } from '../types/kanban.types'
import type { TeamMember } from './supabaseQueries'

/** The fields of a board card that can be edited in its drawer. Each one is also a field of the saved brief. */
export interface CardEdits {
  subjectLine?: string
  theme?: string
  clientGroup?: string[]
  region?: string[]
  channel?: string[]
  contentApprovalDate?: string
  sendDate?: string
  tags?: string
}

/** The brief with the edits made, as a copy. The rest of the brief is untouched. */
export function briefWithEdits(brief: BriefPayload, edits: CardEdits, now: Date = new Date()): BriefPayload {
  const campaign = { ...brief.campaign }
  const audience = { ...brief.audience }
  const deadlines = { ...brief.deadlines }
  if (edits.subjectLine !== undefined) campaign.subjectLine = edits.subjectLine
  if (edits.theme !== undefined) campaign.theme = edits.theme as BriefPayload['campaign']['theme']
  if (edits.clientGroup !== undefined) (audience as { clientGroup?: string[] }).clientGroup = edits.clientGroup
  if (edits.region !== undefined) audience.region = edits.region as BriefPayload['audience']['region']
  if (edits.channel !== undefined) audience.channel = edits.channel as BriefPayload['audience']['channel']
  if (edits.contentApprovalDate !== undefined) deadlines.contentApprovalDate = edits.contentApprovalDate
  if (edits.sendDate !== undefined) deadlines.sendDate = edits.sendDate
  if (edits.tags !== undefined) (deadlines as { tags?: string }).tags = edits.tags
  return { ...brief, meta: { ...brief.meta, updatedAt: now.toISOString() }, campaign, audience, deadlines }
}

/** The card with the edits made, as a copy. */
export function cardWithEdits(card: KanbanCard, edits: CardEdits): KanbanCard {
  return { ...card, ...Object.fromEntries(Object.entries(edits).filter(([, v]) => v !== undefined)) }
}

/** Why an edit cannot be saved, or null. The same rules the brief form holds the brief to. */
export function checkCardEdits(card: KanbanCard, edits: CardEdits): string | null {
  const next = cardWithEdits(card, edits)
  if (edits.subjectLine !== undefined && !next.subjectLine.trim()) return 'The subject line cannot be empty.'
  if (edits.clientGroup !== undefined && next.clientGroup.length === 0) return 'Select at least one client group.'
  if (edits.region !== undefined && next.region.length === 0) return 'Select at least one region.'
  if (edits.channel !== undefined && next.channel.length === 0) return 'Select at least one channel.'
  if (edits.sendDate !== undefined && !next.sendDate) return 'The send date cannot be empty.'
  return null
}

/** Today's date as the calendar shows it where the person is (not the UTC day), as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** The production start to record when a card moves to `column`: today, on the move into In Progress, unless a date is already there. */
export function productionStart(card: KanbanCard, column: KanbanColumn, now: Date = new Date()): string | undefined {
  if (column !== 'in-progress' || card.startDate) return undefined
  return localDate(now)
}

/** The first day the card entered In Progress, for cards that got there before the start date was recorded. */
export function firstInProgressDate(card: KanbanCard): string {
  const entry = card.columnHistory.find((h) => h.column === 'in-progress')
  if (!entry) return ''
  const when = new Date(entry.at)
  return Number.isNaN(when.getTime()) ? '' : localDate(when)
}

/** The names to choose an assignee from: producers and admins, in order, each once. */
export function producersFrom(members: readonly TeamMember[]): string[] {
  const names = members
    .filter((m) => (m.role === 'producer' || m.role === 'admin') && m.displayName.trim() !== '')
    .map((m) => m.displayName.trim())
  return [...new Set(names)].sort((a, b) => a.localeCompare(b))
}
