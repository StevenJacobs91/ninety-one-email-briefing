// ─── Notification event types ────────────────────────────────────────────────

export type NotificationEventType =
  | 'brief_submitted'
  | 'brief_updated'
  | 'brief_cancelled'
  | 'kanban_moved'
  | 'kanban_card_removed'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'approval_expired'
  | 'user_invited'
  | 'deadline_approaching'

export type NotificationEventGroup = 'brief' | 'board' | 'approval' | 'system'

export interface NotificationEventMeta {
  label: string
  description: string
  group: NotificationEventGroup
  defaultSubject: string
  /** Merge tags available for the subject template */
  mergeTags: string[]
}

export const NOTIFICATION_EVENT_META: Record<NotificationEventType, NotificationEventMeta> = {
  brief_submitted: {
    label: 'Brief Submitted',
    description: 'Fires when a requester submits a new email brief.',
    group: 'brief',
    defaultSubject: 'New Brief Submitted: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{emailType}}', '{{sendDate}}', '{{requesterName}}', '{{urgency}}'],
  },
  brief_updated: {
    label: 'Brief Updated',
    description: 'Fires when an existing brief is edited and re-submitted.',
    group: 'brief',
    defaultSubject: 'Brief Updated: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{emailType}}', '{{requesterName}}'],
  },
  brief_cancelled: {
    label: 'Brief Cancelled',
    description: 'Fires when a brief card is removed from the production board.',
    group: 'brief',
    defaultSubject: 'Brief Cancelled: {{emailName}}',
    mergeTags: ['{{emailName}}', '{{cancelledBy}}'],
  },
  kanban_moved: {
    label: 'Card Moved on Board',
    description: 'Fires when a brief is moved to a new column on the production board.',
    group: 'board',
    defaultSubject: 'Brief Status Updated: {{emailName}} → {{toColumn}}',
    mergeTags: ['{{emailName}}', '{{fromColumn}}', '{{toColumn}}', '{{movedBy}}', '{{sendDate}}'],
  },
  kanban_card_removed: {
    label: 'Card Removed from Board',
    description: 'Fires when a card is permanently deleted from the production board.',
    group: 'board',
    defaultSubject: 'Brief Removed from Board: {{emailName}}',
    mergeTags: ['{{emailName}}', '{{removedBy}}', '{{sendDate}}'],
  },
  approval_requested: {
    label: 'Approval Requested',
    description: 'Fires when a brief is submitted for review or approval.',
    group: 'approval',
    defaultSubject: 'Approval Required: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{requesterName}}', '{{approverRole}}', '{{dueDate}}'],
  },
  approval_approved: {
    label: 'Brief Approved',
    description: 'Fires when an approver marks a brief as approved.',
    group: 'approval',
    defaultSubject: 'Brief Approved ✓: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{approvedBy}}', '{{approvedAt}}'],
  },
  approval_rejected: {
    label: 'Brief Rejected',
    description: 'Fires when an approver rejects a brief with optional feedback.',
    group: 'approval',
    defaultSubject: 'Brief Rejected: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{rejectedBy}}', '{{reason}}'],
  },
  approval_expired: {
    label: 'Approval Overdue',
    description: 'Fires when an approval deadline passes without action.',
    group: 'approval',
    defaultSubject: '⚠️ Approval Overdue: {{campaignName}}',
    mergeTags: ['{{campaignName}}', '{{dueDate}}', '{{approverRole}}'],
  },
  user_invited: {
    label: 'User Invited',
    description: 'Fires when a new team member is added to the workspace.',
    group: 'system',
    defaultSubject: 'New Team Member: {{displayName}} joined as {{role}}',
    mergeTags: ['{{displayName}}', '{{email}}', '{{role}}', '{{invitedBy}}'],
  },
  deadline_approaching: {
    label: 'Deadline Approaching',
    description: 'Fires when a brief\'s send date is within the configured warning period.',
    group: 'system',
    defaultSubject: '⚠️ Send Deadline Approaching: {{emailName}} ({{sendDate}})',
    mergeTags: ['{{emailName}}', '{{sendDate}}', '{{urgency}}', '{{contentApprovalDate}}'],
  },
}

export const NOTIFICATION_GROUP_META: Record<NotificationEventGroup, { label: string; description: string }> = {
  brief: {
    label: 'Brief Lifecycle',
    description: 'Events triggered when a brief is submitted, updated, or cancelled.',
  },
  board: {
    label: 'Production Board',
    description: 'Events triggered by activity on the Kanban production board.',
  },
  approval: {
    label: 'Approval Workflow',
    description: 'Events triggered by approval actions (requires Approvals to be enabled).',
  },
  system: {
    label: 'System & Deadlines',
    description: 'Team management and automated deadline warning events.',
  },
}

// ─── Per-event configuration ──────────────────────────────────────────────────

export interface NotificationEventConfig {
  eventType: NotificationEventType
  /** Whether this event fires notifications */
  enabled: boolean
  /** Override the global webhook URL for this event only (leave empty to use global) */
  webhookUrl: string
  /** Subject line template; supports {{merge_tags}} */
  subjectTemplate: string
  /** Include the requester's email in the recipients payload */
  sendToRequester: boolean
  /** Include the producer/team email in the recipients payload */
  sendToTeam: boolean
  /** Comma-separated list of additional recipient email addresses */
  additionalRecipients: string
  /** Include the full brief JSON in the payload (vs summary fields only) */
  includeFullPayload: boolean
}

// ─── Global notification settings ────────────────────────────────────────────

export interface NotificationsSettings {
  /** Master on/off switch */
  enabled: boolean
  /** Default Power Automate HTTP trigger URL used by all events that don't have their own */
  globalWebhookUrl: string
  /** Automatically retry failed webhook calls */
  retryOnFailure: boolean
  /** Number of retry attempts (1–5) */
  maxRetries: number
  /** Write delivery outcomes to the audit log */
  logDelivery: boolean
  /** Deadline warning window in hours (default 48) */
  deadlineWarningHours: number
  /** Per-event configuration */
  events: NotificationEventConfig[]
}

// ─── Delivery result ─────────────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean
  statusCode?: number
  error?: string
  eventType: NotificationEventType
  timestamp: string
}
