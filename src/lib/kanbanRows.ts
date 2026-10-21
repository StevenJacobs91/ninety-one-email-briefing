import type { KanbanCard } from '../types/kanban.types'

export interface KanbanCardRow {
  id: string
  team_id: string
  brief_id: string
  email_name: string
  email_type: string
  theme: string
  subject_line: string
  region: string[]
  channel: string[]
  client_group: string[]
  send_date: string | null
  content_approval_date: string | null
  urgency: string
  column: string
  submitted_at: string
  column_history: Array<{ column: string; at: string }>
  notes: string
  tags: string
  // Campaign Planner extension columns (optional — added via migration)
  assignee?: string | null
  start_date?: string | null
  progress?: number | null
  comments?: Array<{ id: string; authorId: string; authorName: string; text: string; createdAt: string }> | null
  // Who submitted the brief (added via migration; absent on older rows)
  attachments?: { name: string; size: number; type: string; path?: string }[] | null
  submitted_by_name?: string | null
  submitted_by_email?: string | null
}

export function rowToCard(row: KanbanCardRow): KanbanCard {
  return {
    id: row.id,
    briefId: row.brief_id,
    emailName: row.email_name,
    emailType: row.email_type,
    theme: row.theme,
    subjectLine: row.subject_line,
    region: row.region ?? [],
    channel: row.channel ?? [],
    clientGroup: row.client_group ?? [],
    sendDate: row.send_date ?? '',
    contentApprovalDate: row.content_approval_date ?? '',
    urgency: row.urgency as 'standard' | 'urgent',
    column: row.column as KanbanCard['column'],
    submittedAt: row.submitted_at,
    columnHistory: (row.column_history ?? []) as KanbanCard['columnHistory'],
    notes: row.notes ?? '',
    tags: row.tags ?? '',
    assignee: row.assignee ?? undefined,
    startDate: row.start_date ?? undefined,
    progress: row.progress ?? undefined,
    comments: (row.comments ?? []) as KanbanCard['comments'],
    attachments: row.attachments ?? [],
    submittedByName: row.submitted_by_name ?? undefined,
    submittedByEmail: row.submitted_by_email ?? undefined,
  }
}

export function cardToRow(card: KanbanCard, teamId: string): Record<string, unknown> {
  return {
    id: card.id,
    team_id: teamId,
    brief_id: card.briefId,
    email_name: card.emailName,
    email_type: card.emailType,
    theme: card.theme,
    subject_line: card.subjectLine,
    region: card.region,
    channel: card.channel,
    client_group: card.clientGroup,
    send_date: card.sendDate || null,
    content_approval_date: card.contentApprovalDate || null,
    urgency: card.urgency,
    column: card.column,
    submitted_at: card.submittedAt,
    column_history: card.columnHistory,
    notes: card.notes,
    tags: card.tags,
    assignee: card.assignee ?? null,
    start_date: card.startDate ?? null,
    progress: card.progress ?? null,
    comments: card.comments ?? [],
    // Only sent when there are files, so a card without any still saves where the column does not exist yet.
    ...(card.attachments && card.attachments.length > 0 ? { attachments: card.attachments } : {}),
    submitted_by_name: card.submittedByName ?? null,
    submitted_by_email: card.submittedByEmail ?? null,
  }
}
