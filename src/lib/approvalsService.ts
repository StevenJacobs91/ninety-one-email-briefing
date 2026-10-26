import { supabase } from './supabase'
import type {
  ApprovalRecord,
  ApprovalComment,
  ApprovalStatus,
  ApprovalRole,
  CommentType,
  CommentCategory,
  ApprovalStageConfig,
  ApprovalPools,
} from '../types/approval.types'
import { APPROVAL_ROLE_LABELS, friendlyApprovalError } from './approvalRouting'
import type { BriefPayload } from '../types/brief.types'

// ─── Private DB row shapes ────────────────────────────────────

interface ApprovalRow {
  id: string
  team_id: string
  brief_id: string
  email_name: string
  status: string
  requested_by: string
  requested_by_name: string
  requested_at: string
  decided_by: string | null
  decided_by_name: string | null
  decided_at: string | null
  decision_comment: string | null
  approver_role: string
  approver_user_id: string | null
  due_date: string | null
  stage: number
  total_stages: number
  stages_snapshot: ApprovalStageConfig[] | null
  round: number | null
  content_hash: string | null
  stale: boolean | null
  version_snapshot: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface CommentRow {
  id: string
  team_id: string
  approval_id: string
  brief_id: string
  parent_id: string | null
  author_id: string
  author_name: string
  author_role: string
  body: string
  comment_type: string
  category: string
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// ─── Row mappers ──────────────────────────────────────────────

function rowToApproval(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    teamId: row.team_id,
    briefId: row.brief_id,
    emailName: row.email_name,
    status: row.status as ApprovalStatus,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by,
    decidedByName: row.decided_by_name,
    decidedAt: row.decided_at,
    decisionComment: row.decision_comment,
    approverRole: row.approver_role as ApprovalRole,
    approverUserId: row.approver_user_id,
    dueDate: row.due_date,
    stage: row.stage,
    totalStages: row.total_stages,
    stagesSnapshot: row.stages_snapshot ?? [],
    round: row.round ?? 1,
    contentHash: row.content_hash ?? null,
    stale: row.stale ?? false,
    versionSnapshot: row.version_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToComment(row: CommentRow): ApprovalComment {
  return {
    id: row.id,
    teamId: row.team_id,
    approvalId: row.approval_id,
    briefId: row.brief_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    commentType: row.comment_type as CommentType,
    category: row.category as CommentCategory,
    isResolved: row.is_resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Approvals ────────────────────────────────────────────────

/** The database's refusals arrive as short codes; this turns them into something a person can act on. */
function approvalError(prefix: string, message: string): Error {
  const friendly = friendlyApprovalError(message, APPROVAL_ROLE_LABELS)
  return new Error(friendly === message ? `${prefix}: ${message}` : friendly)
}

/**
 * Submits a brief for approval, or resubmits it after changes were asked for. The database reads the brief itself (so what
 * is approved is what is saved), checks that every stage still to run has someone who could decide it other than the
 * person submitting, and refuses a second open approval. `startStage` above 1 resumes at the stage that asked for changes,
 * keeping the approvals already given for the stages before it.
 */
export async function requestApproval(params: {
  briefId: string
  emailName: string
  stages: ApprovalStageConfig[]
  startStage?: number
}): Promise<ApprovalRecord> {
  const { briefId, emailName, stages, startStage = 1 } = params

  if (stages.length === 0) {
    throw new Error('At least one approval stage is required')
  }

  const { data, error } = await supabase.rpc('request_approval', {
    p_brief_id: briefId,
    p_email_name: emailName,
    p_stages: stages as unknown as Record<string, unknown>[],
    p_start_stage: startStage,
  })

  if (error) throw approvalError('Failed to request approval', error.message)
  return rowToApproval(data as ApprovalRow)
}

/** The requester (or an admin) takes a pending approval back. */
export async function withdrawApproval(params: { id: string; reason?: string }): Promise<ApprovalRecord> {
  const { data, error } = await supabase.rpc('withdraw_approval', { p_id: params.id, p_reason: params.reason ?? '' })
  if (error) throw approvalError('Failed to withdraw the approval', error.message)
  return rowToApproval(data as ApprovalRow)
}

/** The people who could decide an approval, so they can be told it is waiting. */
export async function getApprovalRecipients(approvalId: string): Promise<{ userId: string; displayName: string; email: string }[]> {
  const { data, error } = await supabase.rpc('approval_recipients', { p_approval_id: approvalId })
  if (error) throw approvalError('Failed to look up the approvers', error.message)
  return ((data ?? []) as { user_id: string; display_name: string | null; email: string | null }[])
    .map((r) => ({ userId: r.user_id, displayName: r.display_name ?? '', email: r.email ?? '' }))
}

/** Admins only: distribute a card the approval rules would block, with a reason that is kept on record. */
export async function distributeWithOverride(params: { cardId: string; reason: string }): Promise<void> {
  const { error } = await supabase.rpc('distribute_with_override', { p_card_id: params.cardId, p_reason: params.reason })
  if (error) throw approvalError('Failed to distribute', error.message)
}

export interface ApprovalOverride {
  id: string
  briefId: string
  actorName: string
  reason: string
  blockedFor: string
  createdAt: string
}

/** Every time an admin distributed a brief without the approval the team requires. */
export async function getApprovalOverrides(teamId: string): Promise<ApprovalOverride[]> {
  const { data, error } = await supabase
    .from('approval_overrides')
    .select('id, brief_id, actor_name, reason, blocked_for, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch overrides: ${error.message}`)
  return ((data ?? []) as { id: string; brief_id: string; actor_name: string; reason: string; blocked_for: string; created_at: string }[])
    .map((r) => ({ id: r.id, briefId: r.brief_id, actorName: r.actor_name, reason: r.reason, blockedFor: r.blocked_for, createdAt: r.created_at }))
}

export async function getApprovals(
  teamId: string,
  filters?: { briefId?: string; status?: ApprovalStatus }
): Promise<ApprovalRecord[]> {
  let query = supabase
    .from('approvals')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (filters?.briefId) query = query.eq('brief_id', filters.briefId)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch approvals: ${error.message}`)
  return (data ?? []).map((row) => rowToApproval(row as ApprovalRow))
}

export async function getApprovalById(id: string): Promise<ApprovalRecord | null> {
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToApproval(data as ApprovalRow)
}

/**
 * Records a decision. The database checks that the person is one of the approvers for the stage, is not the one who
 * submitted it, and that it is still pending, then starts the next stage in the same step.
 */
export async function decideApproval(params: {
  id: string
  decision: 'approved' | 'rejected' | 'changes_requested'
  comment: string
}): Promise<ApprovalRecord> {
  const { data, error } = await supabase.rpc('decide_approval', {
    p_id: params.id,
    p_decision: params.decision,
    p_comment: params.comment,
  })

  if (error) throw approvalError('Failed to record the decision', error.message)
  return rowToApproval(data as ApprovalRow)
}

// ─── Approvers ────────────────────────────────────────────────

/** Who may decide each role's stages. */
export async function getApprovalPools(teamId: string): Promise<ApprovalPools> {
  const { data, error } = await supabase
    .from('approval_pool_members')
    .select('role, user_id')
    .eq('team_id', teamId)

  if (error) throw new Error(`Failed to fetch approvers: ${error.message}`)
  const pools: ApprovalPools = {}
  for (const row of (data ?? []) as { role: ApprovalRole; user_id: string }[]) {
    pools[row.role] = [...(pools[row.role] ?? []), row.user_id]
  }
  return pools
}

/** Replaces a role's approvers. Admins only; the database refuses anyone else. */
export async function setApprovalPool(role: ApprovalRole, userIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_approval_pool', { p_role: role, p_user_ids: userIds })
  if (error) {
    throw new Error(error.message === 'admin_only' ? 'Only admins can change who the approvers are.' : `Failed to save approvers: ${error.message}`)
  }
}

export async function fetchBriefById(briefId: string): Promise<BriefPayload | null> {
  const { data, error } = await supabase
    .from('briefs')
    .select('data')
    .eq('brief_id', briefId)
    .single()

  if (error || !data) return null
  return data.data as BriefPayload
}

// ─── Comments ─────────────────────────────────────────────────

export async function addComment(params: {
  teamId: string
  approvalId: string
  briefId: string
  parentId?: string
  authorId: string
  authorName: string
  authorRole: string
  body: string
  commentType: CommentType
  category: CommentCategory
}): Promise<ApprovalComment> {
  const { data, error } = await supabase
    .from('approval_comments')
    .insert({
      team_id: params.teamId,
      approval_id: params.approvalId,
      brief_id: params.briefId,
      parent_id: params.parentId ?? null,
      author_id: params.authorId,
      author_name: params.authorName,
      author_role: params.authorRole,
      body: params.body,
      comment_type: params.commentType,
      category: params.category,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add comment: ${error.message}`)
  return rowToComment(data as CommentRow)
}

export async function getComments(
  approvalId: string,
  includeResolved = true
): Promise<ApprovalComment[]> {
  let query = supabase
    .from('approval_comments')
    .select('*')
    .eq('approval_id', approvalId)
    .order('created_at', { ascending: true })

  if (!includeResolved) {
    query = query.eq('is_resolved', false)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch comments: ${error.message}`)

  const flat = (data ?? []).map((row) => rowToComment(row as CommentRow))

  // Build reply tree client-side
  const byId = new Map<string, ApprovalComment>()
  const roots: ApprovalComment[] = []

  for (const comment of flat) {
    byId.set(comment.id, { ...comment, replies: [] })
  }
  for (const comment of byId.values()) {
    if (comment.parentId) {
      const parent = byId.get(comment.parentId)
      if (parent) {
        parent.replies = parent.replies ?? []
        parent.replies.push(comment)
      } else {
        roots.push(comment)
      }
    } else {
      roots.push(comment)
    }
  }

  return roots
}

export async function resolveComment(params: {
  id: string
  resolvedBy: string
  resolved: boolean
}): Promise<void> {
  const { error } = await supabase
    .from('approval_comments')
    .update({
      is_resolved: params.resolved,
      resolved_by: params.resolved ? params.resolvedBy : null,
      resolved_at: params.resolved ? new Date().toISOString() : null,
    })
    .eq('id', params.id)

  if (error) throw new Error(`Failed to resolve comment: ${error.message}`)
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('approval_comments')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete comment: ${error.message}`)
}
