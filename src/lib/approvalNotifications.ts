import type { ApprovalRecord } from '../types/approval.types'
import type { NotificationEventType } from '../types/notifications.types'
import { APPROVAL_ROLE_LABELS } from './approvalRouting'

// What each approval event tells Power Automate. Every payload names the people who should be told (as `toEmails`), so the
// flow does not have to work out who the approvers are.

export interface Person {
  name: string
  email: string
}

export interface ApprovalNotification {
  eventType: NotificationEventType
  data: Record<string, unknown>
}

const emails = (people: Person[]) => people.map((p) => p.email).filter(Boolean).join(', ')

function base(a: ApprovalRecord) {
  return {
    campaignName: a.emailName,
    emailName: a.emailName,
    briefId: a.briefId,
    requesterName: a.requestedByName,
    approverRole: APPROVAL_ROLE_LABELS[a.approverRole] ?? a.approverRole,
    stage: a.stage,
    totalStages: a.totalStages,
    round: a.round,
  }
}

/** A stage is waiting on its approvers (a first submission, a resubmission, or the next stage after an approval). */
export function requestedNotification(a: ApprovalRecord, approvers: Person[], requester?: Person): ApprovalNotification {
  return {
    eventType: 'approval_requested',
    data: {
      ...base(a),
      requesterEmail: requester?.email ?? '',
      toEmails: emails(approvers),
      approverEmails: emails(approvers),
      dueDate: a.dueDate ?? '',
    },
  }
}

/** A decision on a stage, for the person who submitted it. `final` is true when this approval completes the last stage. */
export function decisionNotification(
  a: ApprovalRecord,
  decision: 'approved' | 'rejected' | 'changes_requested',
  requester?: Person,
): ApprovalNotification {
  const common = {
    ...base(a),
    requesterEmail: requester?.email ?? '',
    toEmails: requester?.email ?? '',
    reason: a.decisionComment ?? '',
  }
  if (decision === 'approved') {
    return {
      eventType: 'approval_approved',
      data: { ...common, approvedBy: a.decidedByName ?? '', approvedAt: a.decidedAt ?? '', final: a.stage === a.totalStages },
    }
  }
  if (decision === 'rejected') {
    return { eventType: 'approval_rejected', data: { ...common, rejectedBy: a.decidedByName ?? '' } }
  }
  return { eventType: 'approval_changes_requested', data: { ...common, requestedBy: a.decidedByName ?? '' } }
}

/** The requester took a pending approval back, for the approvers who were waiting on it. */
export function withdrawnNotification(a: ApprovalRecord, approvers: Person[], reason: string): ApprovalNotification {
  return {
    eventType: 'approval_withdrawn',
    data: { ...base(a), withdrawnBy: a.decidedByName ?? a.requestedByName, reason, toEmails: emails(approvers), approverEmails: emails(approvers) },
  }
}

/** An admin distributed a brief the approval rules would have blocked. */
export function overrideNotification(params: {
  emailName: string
  briefId: string
  overriddenBy: string
  reason: string
  requester?: Person
}): ApprovalNotification {
  return {
    eventType: 'approval_overridden',
    data: {
      campaignName: params.emailName,
      emailName: params.emailName,
      briefId: params.briefId,
      overriddenBy: params.overriddenBy,
      reason: params.reason,
      requesterEmail: params.requester?.email ?? '',
      toEmails: params.requester?.email ?? '',
    },
  }
}
