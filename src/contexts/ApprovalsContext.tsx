import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type {
  ApprovalRecord,
  ApprovalComment,
  ApprovalStatus,
  CommentType,
  CommentCategory,
  ApprovalStageConfig,
} from '../types/approval.types'
import type { BriefPayload } from '../types/brief.types'
import {
  requestApproval as requestApprovalService,
  getApprovals,
  updateApprovalStatus,
  addComment as addCommentService,
  getComments,
  resolveComment as resolveCommentService,
} from '../lib/approvalsService'
import { useAuth } from './AuthContext'
import { useSettings } from './SettingsContext'

// ─── Context shape ────────────────────────────────────────────

interface ApprovalsContextValue {
  approvals: ApprovalRecord[]
  pendingCount: number
  loading: boolean
  error: string | null

  requestApproval: (
    brief: BriefPayload,
    emailName: string,
    stages: ApprovalStageConfig[]
  ) => Promise<ApprovalRecord>

  approve: (approvalId: string, comment: string) => Promise<void>
  reject: (approvalId: string, comment: string) => Promise<void>
  requestChanges: (approvalId: string, comment: string) => Promise<void>

  addComment: (
    approvalId: string,
    briefId: string,
    params: {
      body: string
      commentType: CommentType
      category: CommentCategory
      parentId?: string
    }
  ) => Promise<ApprovalComment>

  getCommentsForApproval: (approvalId: string) => Promise<ApprovalComment[]>
  resolveComment: (commentId: string, resolved: boolean) => Promise<void>
  refreshApprovals: () => Promise<void>

  // Lookup helpers
  getLatestApprovalForBrief: (briefId: string) => ApprovalRecord | undefined
  getApprovalStatusForBrief: (briefId: string) => ApprovalStatus | 'none'
}

const ApprovalsContext = createContext<ApprovalsContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────

export function ApprovalsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const { settings } = useSettings()
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshApprovals = useCallback(async () => {
    if (!profile?.teamId) return
    try {
      const data = await getApprovals(profile.teamId)
      setApprovals(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals')
    }
  }, [profile?.teamId])

  // Initial load + polling every 30s
  useEffect(() => {
    if (!profile?.teamId || !settings.approvals?.enabled) return

    setLoading(true)
    refreshApprovals().finally(() => setLoading(false))

    intervalRef.current = setInterval(refreshApprovals, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [profile?.teamId, settings.approvals?.enabled, refreshApprovals])

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  // ─── Actions ─────────────────────────────────────────────────

  const requestApproval = useCallback(
    async (brief: BriefPayload, emailName: string, stages: ApprovalStageConfig[]) => {
      if (!profile) throw new Error('Not authenticated')
      const record = await requestApprovalService({
        teamId: profile.teamId,
        briefId: brief.meta.briefId,
        emailName,
        requestedBy: profile.id,
        requestedByName: profile.displayName,
        briefSnapshot: brief,
        stages,
      })
      await refreshApprovals()
      return record
    },
    [profile, refreshApprovals]
  )

  const resolveApprovalAction = useCallback(
    async (approvalId: string, status: ApprovalStatus, comment: string) => {
      if (!profile) throw new Error('Not authenticated')

      const allStages = settings.approvals?.defaultStages ?? []
      await updateApprovalStatus({
        id: approvalId,
        status,
        decidedBy: profile.id,
        decidedByName: profile.displayName,
        decisionComment: comment,
        teamId: profile.teamId,
        allStages,
      })
      await refreshApprovals()
    },
    [profile, settings.approvals?.defaultStages, refreshApprovals]
  )

  const approve = useCallback(
    (approvalId: string, comment: string) => resolveApprovalAction(approvalId, 'approved', comment),
    [resolveApprovalAction]
  )

  const reject = useCallback(
    (approvalId: string, comment: string) => resolveApprovalAction(approvalId, 'rejected', comment),
    [resolveApprovalAction]
  )

  const requestChanges = useCallback(
    (approvalId: string, comment: string) =>
      resolveApprovalAction(approvalId, 'changes_requested', comment),
    [resolveApprovalAction]
  )

  const addComment = useCallback(
    async (
      approvalId: string,
      briefId: string,
      params: {
        body: string
        commentType: CommentType
        category: CommentCategory
        parentId?: string
      }
    ) => {
      if (!profile) throw new Error('Not authenticated')
      return addCommentService({
        teamId: profile.teamId,
        approvalId,
        briefId,
        parentId: params.parentId,
        authorId: profile.id,
        authorName: profile.displayName,
        authorRole: profile.role,
        body: params.body,
        commentType: params.commentType,
        category: params.category,
      })
    },
    [profile]
  )

  const getCommentsForApproval = useCallback(
    (approvalId: string) => getComments(approvalId),
    []
  )

  const resolveComment = useCallback(
    async (commentId: string, resolved: boolean) => {
      if (!profile) throw new Error('Not authenticated')
      await resolveCommentService({ id: commentId, resolvedBy: profile.id, resolved })
    },
    [profile]
  )

  // ─── Lookup helpers ───────────────────────────────────────────

  const getLatestApprovalForBrief = useCallback(
    (briefId: string) => {
      return approvals
        .filter((a) => a.briefId === briefId)
        .sort((a, b) => b.stage - a.stage)[0]
    },
    [approvals]
  )

  const getApprovalStatusForBrief = useCallback(
    (briefId: string): ApprovalStatus | 'none' => {
      const latest = getLatestApprovalForBrief(briefId)
      return latest?.status ?? 'none'
    },
    [getLatestApprovalForBrief]
  )

  return (
    <ApprovalsContext.Provider
      value={{
        approvals,
        pendingCount,
        loading,
        error,
        requestApproval,
        approve,
        reject,
        requestChanges,
        addComment,
        getCommentsForApproval,
        resolveComment,
        refreshApprovals,
        getLatestApprovalForBrief,
        getApprovalStatusForBrief,
      }}
    >
      {children}
    </ApprovalsContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────

export function useApprovals() {
  const ctx = useContext(ApprovalsContext)
  if (!ctx) throw new Error('useApprovals must be used inside ApprovalsProvider')
  return ctx
}
