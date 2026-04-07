// ─── Approval Types ───────────────────────────────────────────

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'

export type ApprovalRole =
  | 'brand_guardian'
  | 'legal'
  | 'manager'
  | 'reviewer'

export type CommentType =
  | 'approval'
  | 'change_request'
  | 'suggestion'
  | 'question'
  | 'private_note'

export type CommentCategory =
  | 'brand'
  | 'grammar'
  | 'compliance'
  | 'general'

// ─── Core records ─────────────────────────────────────────────

export interface ApprovalRecord {
  id: string
  teamId: string
  briefId: string
  emailName: string
  status: ApprovalStatus

  requestedBy: string
  requestedByName: string
  requestedAt: string

  decidedBy: string | null
  decidedByName: string | null
  decidedAt: string | null
  decisionComment: string | null

  approverRole: ApprovalRole
  approverUserId: string | null
  dueDate: string | null

  stage: number
  totalStages: number

  // Full BriefPayload at time of request — typed loosely to avoid circular import
  versionSnapshot: Record<string, unknown>

  createdAt: string
  updatedAt: string
}

export interface ApprovalComment {
  id: string
  teamId: string
  approvalId: string
  briefId: string
  parentId: string | null

  authorId: string
  authorName: string
  authorRole: string

  body: string
  commentType: CommentType
  category: CommentCategory

  isResolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null

  createdAt: string
  updatedAt: string

  // Client-side only: populated when building comment tree
  replies?: ApprovalComment[]
}

// ─── Config / settings ────────────────────────────────────────

export interface ApprovalStageConfig {
  stage: number                     // 1-based
  role: ApprovalRole
  label: string                     // e.g. "Brand Guardian Review"
  assignedUserId: string | null     // null = any user with matching role
  dueDaysFromRequest: number | null
}

export interface EmailTypeApprovalConfig {
  emailType: string
  stages: ApprovalStageConfig[]
  requireAllStages: boolean
}

export interface ApprovalConfig {
  enabled: boolean
  defaultStages: ApprovalStageConfig[]
  emailTypeConfigs: EmailTypeApprovalConfig[]
  selfServiceRequest: boolean
  blockDistributionWithoutApproval: boolean
}
