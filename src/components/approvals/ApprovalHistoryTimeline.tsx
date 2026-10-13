import type { ApprovalRecord } from '../../types/approval.types'

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Submitted for review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  changes_requested: 'bg-orange-400',
}

const ROLE_LABEL: Record<string, string> = {
  brand_guardian: 'Brand Guardian',
  legal: 'Legal',
  manager: 'Manager',
  reviewer: 'Reviewer',
}

interface ApprovalHistoryTimelineProps {
  approvals: ApprovalRecord[]
}

export function ApprovalHistoryTimeline({ approvals }: ApprovalHistoryTimelineProps) {
  if (approvals.length === 0) return null

  // Sort all events chronologically
  interface TimelineEvent {
    at: string
    label: string
    actor: string
    comment?: string | null
    dotClass: string
    stage: number
    totalStages: number
  }

  const events: TimelineEvent[] = []

  for (const approval of approvals) {
    // Submission event
    events.push({
      at: approval.requestedAt,
      label: `Stage ${approval.stage}/${approval.totalStages} — Submitted for ${ROLE_LABEL[approval.approverRole] ?? approval.approverRole} review`,
      actor: approval.requestedByName,
      dotClass: 'bg-brand-primary dark:bg-brand-accent',
      stage: approval.stage,
      totalStages: approval.totalStages,
    })

    // Decision event
    if (approval.decidedAt && approval.status !== 'pending') {
      events.push({
        at: approval.decidedAt,
        label: `${STATUS_LABEL[approval.status] ?? approval.status} by ${ROLE_LABEL[approval.approverRole] ?? approval.approverRole}`,
        actor: approval.decidedByName ?? '',
        comment: approval.decisionComment,
        dotClass: STATUS_DOT[approval.status] ?? 'bg-gray-400',
        stage: approval.stage,
        totalStages: approval.totalStages,
      })
    }
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <ol className="space-y-3">
      {events.map((event, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 mt-0.5">
            <span className={`w-2.5 h-2.5 rounded-full ${event.dotClass}`} />
            {i < events.length - 1 && (
              <span
                className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1"
                style={{ minHeight: '16px' }}
              />
            )}
          </div>
          <div className="min-w-0 pb-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{event.label}</p>
            {event.actor && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{event.actor}</p>
            )}
            {event.comment && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                "{event.comment}"
              </p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {formatDateTime(event.at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
