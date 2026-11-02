import type { KanbanCard } from '../types/kanban.types'

/** The search and filters shared by the Board, List, Timeline and Calendar views. */
export interface BoardFilters {
  search: string
  emailType: string
  theme: string
  region: string
  channel: string
  column: string
  urgency: string
  sendStatus: string   // 'overdue' | 'due-soon' | 'ok' | ''
  tags: string
  sendDateFrom: string
  sendDateTo: string
}

export const DEFAULT_FILTERS: BoardFilters = {
  search: '',
  emailType: '',
  theme: '',
  region: '',
  channel: '',
  column: '',
  urgency: '',
  sendStatus: '',
  tags: '',
  sendDateFrom: '',
  sendDateTo: '',
}

export function getSendStatus(sendDate: string): 'overdue' | 'due-soon' | 'ok' {
  if (!sendDate) return 'ok'
  const diff = Math.ceil((new Date(sendDate).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'due-soon'
  return 'ok'
}

export function activeFilterCount(filters: BoardFilters): number {
  return Object.values(filters).filter((v) => v !== '').length
}

function matchesSearch(c: KanbanCard, q: string): boolean {
  return (
    c.emailName.toLowerCase().includes(q) ||
    c.subjectLine.toLowerCase().includes(q) ||
    c.emailType.toLowerCase().includes(q) ||
    c.region.some((r) => r.toLowerCase().includes(q)) ||
    c.channel.some((ch) => ch.toLowerCase().includes(q)) ||
    c.clientGroup.some((g) => g.toLowerCase().includes(q)) ||
    c.tags.toLowerCase().includes(q) ||
    c.theme.toLowerCase().includes(q) ||
    (c.assignee ?? '').toLowerCase().includes(q) ||
    (c.submittedByName ?? '').toLowerCase().includes(q) ||
    (c.submittedByEmail ?? '').toLowerCase().includes(q)
  )
}

/** The cards that pass every filter that is set, in the order given. */
export function applyFilters(cards: KanbanCard[], filters: BoardFilters): KanbanCard[] {
  const q = filters.search.trim().toLowerCase()
  const tag = filters.tags.toLowerCase()
  return cards.filter((c) =>
    (!q || matchesSearch(c, q)) &&
    (!filters.emailType || c.emailType === filters.emailType) &&
    (!filters.theme || c.theme === filters.theme) &&
    (!filters.region || c.region.includes(filters.region)) &&
    (!filters.channel || c.channel.includes(filters.channel)) &&
    (!filters.column || c.column === filters.column) &&
    (!filters.urgency || c.urgency === filters.urgency) &&
    (!tag || c.tags.toLowerCase().includes(tag)) &&
    (!filters.sendStatus || getSendStatus(c.sendDate) === filters.sendStatus) &&
    (!filters.sendDateFrom || c.sendDate >= filters.sendDateFrom) &&
    (!filters.sendDateTo || c.sendDate <= filters.sendDateTo),
  )
}
