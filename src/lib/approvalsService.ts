import { supabase } from './supabase'
import type {
  ApprovalRecord,
  ApprovalComment,
  ApprovalStatus,
  ApprovalRole,
  CommentType,
  CommentCategory,
  ApprovalStageConfig,
} from '../types/approval.types'
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

export async function requestApproval(params: {
  teamId: string
  briefId: string
  emailName: string
  requestedBy: string
  requestedByName: string
  briefSnapshot: BriefPayload
  stages: ApprovalStageConfig[]
}): Promise<ApprovalRecord> {
  const { teamId, briefId, emailName, requestedBy, requestedByName, briefSnapshot, stages } = params

  if (stages.length === 0) {
    throw new Error('At least one approval stage is required')
  }

  const firstStage = stages[0]
  const dueDate = firstStage.dueDaysFromRequest
    ? new Date(Date.now() + firstStage.dueDaysFromRequest * 86400000).toISOString()
    : null

  const { data, error } = await supabase
    .from('approvals')
    .insert({
      team_id: teamId,
      brief_id: briefId,
      email_name: emailName,
      status: 'pending',
      requested_by: requestedBy,
      requested_by_name: requestedByName,
      approver_role: firstStage.role,
      approver_user_id: firstStage.assignedUserId ?? null,
      due_date: dueDate,
      stage: 1,
      total_stages: stages.length,
      version_snapshot: briefSnapshot as unknown as Record<string, unknown>,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to request approval: ${error.message}`)
  return rowToApproval(data as ApprovalRow)
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

export async function updateApprovalStatus(params: {
  id: string
  status: ApprovalStatus
  decidedBy: string
  decidedByName: string
  decisionComment: string
  teamId: string
  allStages?: ApprovalStageConfig[]
}): Promise<ApprovalRecord> {
  const { id, status, decidedBy, decidedByName, decisionComment, teamId, allStages } = params

  // Conditional update — only update if still pending to prevent race conditions
  const { data, error } = await supabase
    .from('approvals')
    .update({
      status,
      decided_by: decidedBy,
      decided_by_name: decidedByName,
      decided_at: new Date().toISOString(),
      decision_comment: decisionComment,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) throw new Error(`Failed to update approval: ${error.message}`)

  const updated = rowToApproval(data as ApprovalRow)

  // If approved and more stages remain, insert the next stage
  if (status === 'approved' && updated.stage < updated.totalStages && allStages) {
    const nextStageConfig = allStages.find((s) => s.stage === updated.stage + 1)
    if (nextStageConfig) {
      const dueDate = nextStageConfig.dueDaysFromRequest
        ? new Date(Date.now() + nextStageConfig.dueDaysFromRequest * 86400000).toISOString()
        : null

      await supabase.from('approvals').insert({
        team_id: teamId,
        brief_id: updated.briefId,
        email_name: updated.emailName,
        status: 'pending',
        requested_by: updated.requestedBy,
        requested_by_name: updated.requestedByName,
        approver_role: nextStageConfig.role,
        approver_user_id: nextStageConfig.assignedUserId ?? null,
        due_date: dueDate,
        stage: nextStageConfig.stage,
        total_stages: updated.totalStages,
        version_snapshot: updated.versionSnapshot,
      })
    }
  }

  return updated
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
