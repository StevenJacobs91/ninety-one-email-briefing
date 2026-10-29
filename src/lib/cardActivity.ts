import { v4 as uuidv4 } from 'uuid'
import type { CardActivity, KanbanCard, KanbanColumn } from '../types/kanban.types'
import type { CardEdits } from './cardEdits'

interface Opts {
  now?: Date
  /** The name a theme id is shown by */
  themeName?: (id: string) => string
}

const COLUMN_LABELS: Record<KanbanColumn, string> = { briefed: 'Briefed', 'in-progress': 'In Progress', distributed: 'Distributed' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NONE = '—'
/** Long text (notes, comments, tags) is kept this long in the record */
const MAX_TEXT = 200

const short = (s: string) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s)
const text = (s: string) => (s.trim() ? short(s) : NONE)
const list = (a: readonly string[]) => (a.length > 0 ? a.join(', ') : NONE)

/** "2026-09-30" as "30 Sep 2026", the calendar day as written, whatever the time zone. */
function day(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso ? iso : NONE
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}

const entry = (field: string, label: string, by: string, from: string | undefined, to: string | undefined, opts: Opts): CardActivity =>
  ({ id: uuidv4(), at: (opts.now ?? new Date()).toISOString(), by, field, label, ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}) })

type DetailField = { key: keyof CardEdits; label: string; kind: 'text' | 'theme' | 'list' | 'date' }
const DETAIL_FIELDS: DetailField[] = [
  { key: 'subjectLine', label: 'Subject line', kind: 'text' },
  { key: 'theme', label: 'Brand theme', kind: 'theme' },
  { key: 'clientGroup', label: 'Client groups', kind: 'list' },
  { key: 'region', label: 'Regions', kind: 'list' },
  { key: 'channel', label: 'Channels', kind: 'list' },
  { key: 'contentApprovalDate', label: 'Content approval', kind: 'date' },
  { key: 'sendDate', label: 'Send date', kind: 'date' },
  { key: 'tags', label: 'Tags', kind: 'text' },
]

/** One entry for each brief field in `edits` whose value really changes, in a fixed order. */
export function detailEntries(card: KanbanCard, edits: CardEdits, by: string, opts: Opts = {}): CardActivity[] {
  const show = (kind: DetailField['kind'], value: string | string[]) => {
    if (kind === 'list') return list(value as string[])
    if (kind === 'date') return day(value as string)
    if (kind === 'theme') return (opts.themeName ?? ((id: string) => id))(value as string)
    return text(value as string)
  }
  return DETAIL_FIELDS.flatMap(({ key, label, kind }) => {
    const after = edits[key]
    if (after === undefined) return []
    const before = card[key as keyof KanbanCard] as string | string[]
    const same = Array.isArray(before) ? before.join('\u0000') === (after as string[]).join('\u0000') : before === after
    return same ? [] : [entry(key, label, by, show(kind, before), show(kind, after), opts)]
  })
}

/** Entries for the planning fields (assignee, production start, progress) that really change. A field not given is not a change. */
export function metaEntries(card: KanbanCard, updates: { assignee?: string; startDate?: string; progress?: number }, by: string, opts: Opts = {}): CardActivity[] {
  const out: CardActivity[] = []
  if (updates.assignee !== undefined && updates.assignee !== (card.assignee ?? '')) {
    out.push(entry('assignee', 'Assignee', by, text(card.assignee ?? ''), text(updates.assignee), opts))
  }
  if (updates.startDate !== undefined && updates.startDate !== (card.startDate ?? '')) {
    out.push(entry('startDate', 'Production start', by, day(card.startDate ?? ''), day(updates.startDate), opts))
  }
  if (updates.progress !== undefined && updates.progress !== (card.progress ?? 0)) {
    out.push(entry('progress', 'Progress', by, `${card.progress ?? 0}%`, `${updates.progress}%`, opts))
  }
  return out
}

/** An entry for an edit to a block of text such as the notes, or null when nothing changed. */
export function textEntry(field: string, label: string, from: string, to: string, by: string, opts: Opts = {}): CardActivity | null {
  return from === to ? null : entry(field, label, by, text(from), text(to), opts)
}

export function commentEntry(comment: string, by: string, opts: Opts = {}): CardActivity {
  return entry('comment', 'Comment', by, undefined, short(comment), opts)
}

export interface HistoryEntry {
  key: string
  at: string
  by?: string
  title: string
  detail?: string
  kind: 'move' | 'change'
}

/** Everything that has happened on the card, moves and changes together, oldest first. */
export function historyEntries(card: KanbanCard): HistoryEntry[] {
  const moves: HistoryEntry[] = card.columnHistory.map((h, i) => ({
    key: `move-${i}`,
    at: h.at,
    by: h.by,
    title: `${i === 0 ? 'Added to' : 'Moved to'} ${COLUMN_LABELS[h.column] ?? h.column}${h.override ? ' without the required approval' : ''}`,
    kind: 'move',
  }))
  const changes: HistoryEntry[] = (card.activity ?? []).map((a) => ({
    key: a.id,
    at: a.at,
    by: a.by,
    title: a.field === 'comment' ? 'Comment added' : a.field === 'notes' ? 'Notes edited' : `${a.label} changed`,
    detail: a.field === 'comment' ? a.to : `${a.from ?? NONE} → ${a.to ?? NONE}`,
    kind: 'change',
  }))
  // A stable sort, so a move and a change at the same instant keep the move first.
  return [...moves, ...changes].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}
