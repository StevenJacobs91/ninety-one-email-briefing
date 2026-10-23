import type { KanbanCard } from '../types/kanban.types'
import { sendStatus } from './boardFormat'

export type GroupField =
  | 'none' | 'column' | 'urgency' | 'emailType' | 'submittedBy' | 'assignee' | 'region' | 'channel' | 'sendStatus' | 'sendDate'

export const GROUP_OPTIONS: { id: GroupField; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'column', label: 'Stage' },
  { id: 'urgency', label: 'Urgency' },
  { id: 'emailType', label: 'Type' },
  { id: 'submittedBy', label: 'Submitted by' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'region', label: 'Region' },
  { id: 'channel', label: 'Channel' },
  { id: 'sendStatus', label: 'Status' },
  { id: 'sendDate', label: 'Send date' },
]

export type GroupableCard = Pick<KanbanCard, 'column' | 'urgency' | 'emailType' | 'submittedByName' | 'assignee' | 'region' | 'channel' | 'sendDate'>

export interface CardGroup<T> {
  key: string
  label: string
  cards: T[]
}

/** Where a card goes: its group's name, and where that group sits among the others. */
interface Slot {
  label: string
  /** Groups with a fixed order (a rank), else alphabetical by label */
  rank?: number
  blank?: boolean
}

const STAGES: Record<string, Slot> = {
  briefed: { label: 'Briefed', rank: 0 },
  'in-progress': { label: 'In Progress', rank: 1 },
  distributed: { label: 'Distributed', rank: 2 },
}
const STATUSES: Record<string, Slot> = {
  overdue: { label: 'Overdue', rank: 0 },
  'due-soon': { label: 'Due soon', rank: 1 },
  ok: { label: 'On track', rank: 2 },
}

const DAY = 24 * 60 * 60 * 1000
const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth()
const quarterIndex = (d: Date) => d.getFullYear() * 4 + Math.floor(d.getMonth() / 3)

/** This week (Monday to Sunday), next week, next month, this quarter and next quarter, in that order of priority. */
function sendDateSlot(sendDate: string, now: Date): Slot {
  if (!sendDate) return { label: 'No send date', rank: 7 }
  const date = new Date(`${sendDate.slice(0, 10)}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = today.getTime() - ((today.getDay() + 6) % 7) * DAY
  if (date.getTime() < weekStart) return { label: 'Earlier', rank: 0 }
  if (date.getTime() < weekStart + 7 * DAY) return { label: 'This week', rank: 1 }
  if (date.getTime() < weekStart + 14 * DAY) return { label: 'Next week', rank: 2 }
  if (monthIndex(date) === monthIndex(now) + 1) return { label: 'Next month', rank: 3 }
  if (quarterIndex(date) === quarterIndex(now)) return { label: 'This quarter', rank: 4 }
  if (quarterIndex(date) === quarterIndex(now) + 1) return { label: 'Next quarter', rank: 5 }
  return { label: 'Later', rank: 6 }
}

const text = (value: string | undefined, blank: string): Slot => (value?.trim() ? { label: value.trim() } : { label: blank, blank: true })

function slotOf(card: GroupableCard, field: Exclude<GroupField, 'none'>, now: Date): Slot {
  switch (field) {
    case 'column': return STAGES[card.column] ?? { label: card.column }
    case 'urgency': return card.urgency === 'urgent' ? { label: 'Urgent', rank: 0 } : { label: 'Standard', rank: 1 }
    case 'emailType': return text(card.emailType, 'No type')
    case 'submittedBy': return text(card.submittedByName, 'Unknown')
    case 'assignee': return text(card.assignee, 'Unassigned')
    case 'region': return text(card.region.join(' · '), 'No region')
    case 'channel': return text(card.channel.join(' · '), 'No channel')
    case 'sendStatus': return STATUSES[sendStatus(card.sendDate, now, card.column)]
    case 'sendDate': return sendDateSlot(card.sendDate, now)
  }
}

/**
 * Splits cards into groups by one field, keeping the cards in the order given. A card with several regions or
 * channels sits in one group named by all of them, so the counts add up to the total.
 */
export function groupCards<T extends GroupableCard>(cards: T[], field: GroupField, now: Date = new Date()): CardGroup<T>[] {
  if (field === 'none') return [{ key: 'all', label: '', cards }]
  const groups = new Map<string, { slot: Slot; cards: T[] }>()
  for (const card of cards) {
    const slot = slotOf(card, field, now)
    const entry = groups.get(slot.label) ?? { slot, cards: [] }
    entry.cards.push(card)
    groups.set(slot.label, entry)
  }
  return [...groups.values()]
    .sort((a, b) => {
      if (a.slot.rank !== undefined && b.slot.rank !== undefined) return a.slot.rank - b.slot.rank
      if (a.slot.blank !== b.slot.blank) return a.slot.blank ? 1 : -1
      return a.slot.label.localeCompare(b.slot.label, undefined, { sensitivity: 'base' })
    })
    .map(({ slot, cards: inGroup }) => ({ key: slot.label, label: slot.label, cards: inGroup }))
}

/** A click this far across a bar of this width, as the nearest ten per cent. */
export function progressFromClick(offsetX: number, width: number): number {
  if (width <= 0) return 0
  const fraction = Math.min(Math.max(offsetX / width, 0), 1)
  return Math.round((fraction * 100) / 10) * 10
}

/** One step of ten up or down, landing on a multiple of ten. */
export function stepProgress(current: number, direction: 1 | -1): number {
  const next = direction === 1 ? Math.floor(current / 10) * 10 + 10 : Math.ceil(current / 10) * 10 - 10
  return Math.min(Math.max(next, 0), 100)
}
