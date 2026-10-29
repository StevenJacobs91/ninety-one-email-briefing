export type KanbanColumn = 'briefed' | 'in-progress' | 'distributed'

export interface KanbanColumnHistory {
  column: KanbanColumn
  at: string
  /** Who moved it (absent on moves made before this was recorded) */
  by?: string
  /** Set when an admin distributed it without the approval the team requires */
  override?: boolean
}

/** One change made on a card: what, by whom, when, and what it was before and after. Stored one row per change, never edited. */
export interface CardActivity {
  id: string
  at: string
  by: string
  /** The field's name, such as subjectLine or assignee */
  field: string
  /** What the change is called to read, such as "Subject line" */
  label: string
  from?: string
  to?: string
}

export interface CampaignComment {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export interface ManualCardInput {
  emailName: string
  emailType: string
  theme: string
  subjectLine?: string
  region?: string[]
  channel?: string[]
  clientGroup?: string[]
  sendDate?: string
  contentApprovalDate?: string
  urgency: 'standard' | 'urgent'
  column: KanbanColumn
  assignee?: string
  startDate?: string
  notes?: string
  tags?: string
}

export interface KanbanCard {
  id: string
  briefId: string
  emailName: string
  emailType: string
  theme: string
  subjectLine: string
  region: string[]
  channel: string[]
  clientGroup: string[]
  sendDate: string
  contentApprovalDate: string
  urgency: 'standard' | 'urgent'
  column: KanbanColumn
  submittedAt: string
  columnHistory: KanbanColumnHistory[]
  notes: string
  tags: string
  attachments?: { name: string; size: number; type: string; path?: string }[]   // files attached to the brief
  submittedByName?: string   // who submitted the brief
  submittedByEmail?: string
  // Campaign Planner extensions (optional — backward compatible)
  comments?: CampaignComment[]
  assignee?: string
  startDate?: string   // ISO date — when production work begins
  progress?: number    // 0–100 percent completion
  /** The changes made on the card, oldest first. Read when the card's detail is opened, so it is absent until then. */
  activity?: CardActivity[]
}
