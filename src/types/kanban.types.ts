export type KanbanColumn = 'briefed' | 'in-progress' | 'distributed'

export interface KanbanColumnHistory {
  column: KanbanColumn
  at: string
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
}
