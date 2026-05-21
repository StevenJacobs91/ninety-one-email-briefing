export type KanbanColumn = 'briefed' | 'in-progress' | 'distributed'

export interface KanbanColumnHistory {
  column: KanbanColumn
  at: string
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
  // Campaign Planner extensions (optional — backward compatible)
  comments?: CampaignComment[]
  assignee?: string
  startDate?: string   // ISO date — when production work begins
  progress?: number    // 0–100 percent completion
}
