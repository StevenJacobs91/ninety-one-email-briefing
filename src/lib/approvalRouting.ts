import type {
  ApprovalConfig, ApprovalPools, ApprovalRecord, ApprovalRole, ApprovalStageConfig,
} from '../types/approval.types'

/** The stages a brief follows: those set for its email type if there are any, else the defaults. */
export function resolveStages(config: ApprovalConfig | undefined, emailType: string): ApprovalStageConfig[] {
  const own = config?.emailTypeConfigs?.find((c) => c.emailType === emailType)
  if (own && own.stages.length > 0) return own.stages
  return config?.defaultStages ?? []
}

/** Who may decide a stage: its named approver alone, else everyone in the role's pool. */
export function eligibleApprovers(stage: Pick<ApprovalStageConfig, 'role' | 'assignedUserId'>, pools: ApprovalPools): string[] {
  if (stage.assignedUserId) return [stage.assignedUserId]
  return pools[stage.role] ?? []
}

export const APPROVAL_ROLE_LABELS: Record<ApprovalRole, string> = {
  brand_guardian: 'Brand Guardian',
  legal: 'Legal',
  manager: 'Manager',
  reviewer: 'Reviewer',
}

export type DecisionBlock = 'not_pending' | 'own_request' | 'not_approver'

/**
 * Why someone cannot decide an approval, or null if they can. The database applies the same rules when a decision is
 * sent; this is what lets the screen say so first.
 */
export function decisionBlock(
  approval: Pick<ApprovalRecord, 'status' | 'requestedBy' | 'approverRole' | 'approverUserId'>,
  userId: string | undefined,
  pools: ApprovalPools,
): DecisionBlock | null {
  if (!userId) return 'not_approver'
  if (approval.status !== 'pending') return 'not_pending'
  if (approval.requestedBy === userId) return 'own_request'
  const eligible = eligibleApprovers({ role: approval.approverRole, assignedUserId: approval.approverUserId }, pools)
  return eligible.includes(userId) ? null : 'not_approver'
}

export const DECISION_BLOCK_MESSAGE: Record<DecisionBlock, string> = {
  not_pending: 'This approval has already been decided.',
  own_request: 'You submitted this brief, so someone else has to approve it.',
  not_approver: 'You are not one of the approvers for this stage.',
}

export interface StageIssue {
  stage: number
  role: ApprovalRole
  reason: 'no_approver' | 'only_requester'
}

/** Stages that nobody could decide: no approver set for the role, or the only one is the person submitting. */
export function stageIssues(stages: ApprovalStageConfig[], pools: ApprovalPools, requesterId: string | undefined): StageIssue[] {
  const issues: StageIssue[] = []
  for (const stage of stages) {
    const eligible = eligibleApprovers(stage, pools)
    if (eligible.length === 0) issues.push({ stage: stage.stage, role: stage.role, reason: 'no_approver' })
    else if (eligible.every((id) => id === requesterId)) issues.push({ stage: stage.stage, role: stage.role, reason: 'only_requester' })
  }
  return issues
}

export function describeStageIssue(issue: StageIssue, roleLabel: string): string {
  return issue.reason === 'no_approver'
    ? `Stage ${issue.stage} (${roleLabel}): nobody is set up to approve it. Ask an admin to add approvers in Settings → Approvals.`
    : `Stage ${issue.stage} (${roleLabel}): only you can approve it, and you cannot approve your own submission.`
}

/** Approvals waiting on this person: pending, theirs to decide, and not their own submission. */
export function awaitingMine(approvals: ApprovalRecord[], userId: string | undefined, pools: ApprovalPools): ApprovalRecord[] {
  return approvals.filter((a) => decisionBlock(a, userId, pools) === null)
}

export const mySubmissions = (approvals: ApprovalRecord[], userId: string | undefined) =>
  approvals.filter((a) => !!userId && a.requestedBy === userId)

export const decidedByMe = (approvals: ApprovalRecord[], userId: string | undefined) =>
  approvals.filter((a) => !!userId && a.decidedBy === userId)

/** The current approval for a brief: the newest one, so a second submission is not hidden behind the first's later stage. */
export function latestApprovalForBrief(approvals: ApprovalRecord[], briefId: string): ApprovalRecord | undefined {
  return approvals
    .filter((a) => a.briefId === briefId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.stage - a.stage)[0]
}

export type BriefApprovalState =
  | 'none' | 'pending' | 'changes_requested' | 'rejected' | 'withdrawn' | 'superseded' | 'approved' | 'out_of_date'

export interface BriefApproval {
  state: BriefApprovalState
  /** The newest approval record for the brief */
  latest?: ApprovalRecord
  /** The submission this describes: 1 for the first, 2 after a resubmission */
  round?: number
  /** For changes_requested: the stage to resume at */
  resumeStage?: number
}

/**
 * Where a brief stands. "approved" means every stage has a decision that still covers the brief as it is now; if it was
 * edited after approval, the state is "out_of_date". The database applies the same rule when a card is moved to Distributed.
 */
export function briefApprovalState(approvals: ApprovalRecord[], briefId: string): BriefApproval {
  const latest = latestApprovalForBrief(approvals, briefId)
  if (!latest) return { state: 'none' }
  const base = { latest, round: latest.round }
  switch (latest.status) {
    case 'pending': return { ...base, state: 'pending' }
    case 'changes_requested': return { ...base, state: 'changes_requested', resumeStage: latest.stage }
    case 'rejected': return { ...base, state: 'rejected' }
    case 'withdrawn': return { ...base, state: 'withdrawn' }
    case 'superseded': return { ...base, state: 'superseded' }
    case 'approved': {
      const mine = approvals.filter((a) => a.briefId === briefId && a.status === 'approved' && !a.stale)
      const covered = Array.from({ length: latest.totalStages }, (_, i) => i + 1).every((s) => mine.some((a) => a.stage === s))
      return { ...base, state: covered ? 'approved' : 'out_of_date' }
    }
  }
}

export type DistributionBlockCode =
  | 'not_submitted' | 'approval_pending' | 'changes_requested' | 'approval_rejected' | 'approval_withdrawn' | 'approval_stale'

export const DISTRIBUTION_BLOCK_MESSAGE: Record<DistributionBlockCode, string> = {
  not_submitted: 'This brief has not been submitted for approval yet.',
  approval_pending: 'This brief is still waiting for approval.',
  changes_requested: 'An approver asked for changes, so it needs to be resubmitted.',
  approval_rejected: 'This brief was rejected.',
  approval_withdrawn: 'The approval was withdrawn or closed because the brief changed, so it needs to be submitted again.',
  approval_stale: 'The brief was changed after it was approved, so the approval no longer covers it.',
}

/** The code inside a "distribution_blocked:<code>" refusal from the database, or null if it is anything else. */
export function parseDistributionBlock(message: string): DistributionBlockCode | null {
  const prefix = 'distribution_blocked:'
  if (!message.includes(prefix)) return null
  const code = message.slice(message.indexOf(prefix) + prefix.length).trim().split(/\s/)[0] as DistributionBlockCode
  return code in DISTRIBUTION_BLOCK_MESSAGE ? code : null
}

/** Thrown by a move to Distributed that the database refused, so the screen can explain and offer an admin override. */
export class DistributionBlockedError extends Error {
  constructor(readonly code: DistributionBlockCode) {
    super(DISTRIBUTION_BLOCK_MESSAGE[code])
    this.name = 'DistributionBlockedError'
  }
}

type Perms = Partial<Record<'admin' | 'producer' | 'requester', { canManageApprovals?: boolean }>>

/** Whether a role may see every approval and manage the workflow. Admins and producers by default; Users settings can change it. */
export function canManageApprovals(role: string | undefined, perms: Perms | undefined): boolean {
  if (role !== 'admin' && role !== 'producer') return false
  return perms?.[role]?.canManageApprovals !== false
}

/** The database's reason for refusing something, in plain words. Anything unrecognised is passed through. */
export function friendlyApprovalError(message: string, roleLabels: Partial<Record<string, string>> = {}): string {
  if (message.startsWith('no_approver:')) {
    const role = message.slice('no_approver:'.length)
    return `Nobody is set up to approve the ${roleLabels[role] ?? role} stage. Ask an admin to add approvers in Settings → Approvals.`
  }
  const blocked = parseDistributionBlock(message)
  if (blocked) return DISTRIBUTION_BLOCK_MESSAGE[blocked]
  switch (message) {
    case 'withdraw_not_allowed': return 'Only the person who submitted this, or an admin, can withdraw it.'
    case 'invalid_start_stage': return 'This can only be resubmitted at the stage that asked for changes, or from the start.'
    case 'brief_not_found': return 'The brief could not be found. Save it and try again.'
    case 'admin_only': return 'Only admins can do this.'
    case 'override_reason_required': return 'Please give a reason of at least 10 characters.'
    case 'not_blocked': return 'This brief is not blocked, so it can be moved normally.'
    case 'already_distributed': return 'This brief has already been distributed.'
    case 'card_not_found': return 'That card could not be found. It may have been removed.'
    case 'approval_already_decided': return 'This approval has already been decided.'
    case 'approval_own_request': return 'You submitted this brief, so someone else has to approve it.'
    case 'approval_not_approver': return 'You are not one of the approvers for this stage.'
    case 'approval_already_open': return 'This brief is already waiting for approval.'
    case 'comment_required': return 'Please give a reason (at least 5 characters).'
    case 'approval_not_found': return 'That approval could not be found. It may have been removed.'
    case 'not_signed_in': return 'Please sign in again.'
    default: return message
  }
}
