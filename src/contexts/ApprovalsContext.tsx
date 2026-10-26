import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type {
  ApprovalRecord,
  ApprovalComment,
  ApprovalPools,
  ApprovalRole,
  ApprovalStatus,
  CommentType,
  CommentCategory,
  ApprovalStageConfig,
} from '../types/approval.types'
import type { BriefPayload } from '../types/brief.types'
import {
  requestApproval as requestApprovalService,
  decideApproval,
  withdrawApproval,
  getApprovalRecipients,
  getApprovalOverrides,
  getApprovals,
  getApprovalPools,
  setApprovalPool,
  addComment as addCommentService,
  getComments,
  resolveComment as resolveCommentService,
  type ApprovalOverride,
} from '../lib/approvalsService'
import {
  awaitingMine,
  decidedByMe,
  decisionBlock,
  latestApprovalForBrief,
  mySubmissions,
  type DecisionBlock,
} from '../lib/approvalRouting'
import {
  decisionNotification,
  requestedNotification,
  withdrawnNotification,
  type ApprovalNotification,
  type Person,
} from '../lib/approvalNotifications'
import { triggerNotification } from '../lib/notificationService'
import { fetchTeamMembers } from '../lib/supabaseQueries'
import { useAuth } from './AuthContext'
import { useSettings } from './SettingsContext'

type Decision = 'approved' | 'rejected' | 'changes_requested'

// ─── Context shape ────────────────────────────────────────────

interface ApprovalsContextValue {
  /** Every approval on the team (the database lets everyone on the team read them) */
  approvals: ApprovalRecord[]
  /** Who may decide each role's stages */
  pools: ApprovalPools
  /** Times an admin distributed a brief without the approval the team requires */
  overrides: ApprovalOverride[]
  /** Waiting on the signed-in person: theirs to decide, and not their own submission */
  awaitingMine: ApprovalRecord[]
  /** Submitted by the signed-in person */
  mySubmissions: ApprovalRecord[]
  /** Decided by the signed-in person */
  decidedByMe: ApprovalRecord[]
  /** How many are waiting on the signed-in person, not on the team as a whole */
  pendingCount: number
  loading: boolean
  error: string | null

  /** Why the signed-in person cannot decide this approval, or null if they can */
  decisionBlockFor: (approval: ApprovalRecord) => DecisionBlock | null

  /** Submits a brief, or resubmits it: `startStage` above 1 resumes at the stage that asked for changes. */
  requestApproval: (
    brief: BriefPayload,
    emailName: string,
    stages: ApprovalStageConfig[],
    startStage?: number
  ) => Promise<ApprovalRecord>

  approve: (approvalId: string, comment: string) => Promise<void>
  reject: (approvalId: string, comment: string) => Promise<void>
  requestChanges: (approvalId: string, comment: string) => Promise<void>
  /** The requester (or an admin) takes a pending approval back */
  withdraw: (approvalId: string, reason?: string) => Promise<void>

  /** Admins: replace the people who may decide a role's stages */
  setPool: (role: ApprovalRole, userIds: string[]) => Promise<void>

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
  const [pools, setPools] = useState<ApprovalPools>({})
  const [overrides, setOverrides] = useState<ApprovalOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const membersRef = useRef<Promise<(Person & { id: string })[]> | null>(null)

  /** Loads everything and returns the approvals, or null if it could not. */
  const load = useCallback(async (): Promise<ApprovalRecord[] | null> => {
    if (!profile?.teamId) return null
    try {
      const [data, nextPools, nextOverrides] = await Promise.all([
        getApprovals(profile.teamId),
        getApprovalPools(profile.teamId),
        // The list of overrides is a nicety: if it cannot be read, the rest still works.
        getApprovalOverrides(profile.teamId).catch(() => [] as ApprovalOverride[]),
      ])
      setApprovals(data)
      setPools(nextPools)
      setOverrides(nextOverrides)
      setError(null)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approvals')
      return null
    }
  }, [profile?.teamId])

  const refreshApprovals = useCallback(async () => { await load() }, [load])

  // Initial load, then every 30 seconds, and again whenever the window comes back into view
  useEffect(() => {
    if (!profile?.teamId || !settings.approvals?.enabled) return

    setLoading(true)
    refreshApprovals().finally(() => setLoading(false))

    intervalRef.current = setInterval(refreshApprovals, 30000)
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshApprovals() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [profile?.teamId, settings.approvals?.enabled, refreshApprovals])

  const userId = profile?.id
  const mineAwaiting = useMemo(() => awaitingMine(approvals, userId, pools), [approvals, userId, pools])
  const mineSubmitted = useMemo(() => mySubmissions(approvals, userId), [approvals, userId])
  const mineDecided = useMemo(() => decidedByMe(approvals, userId), [approvals, userId])

  // ─── Notifications ───────────────────────────────────────────
  // Sent after the database has accepted the action. A notification that fails never undoes or blocks what happened.

  const personFor = useCallback(async (id: string): Promise<Person | undefined> => {
    if (!profile?.teamId) return undefined
    if (!membersRef.current) {
      membersRef.current = fetchTeamMembers(profile.teamId).then((list) =>
        list.map((m) => ({ id: m.id, name: m.displayName, email: m.email })))
    }
    try {
      return (await membersRef.current).find((m) => m.id === id)
    } catch {
      membersRef.current = null
      return undefined
    }
  }, [profile?.teamId])

  const approversOf = useCallback(async (approvalId: string): Promise<Person[]> => {
    const list = await getApprovalRecipients(approvalId)
    return list.map((r) => ({ name: r.displayName, email: r.email }))
  }, [])

  const send = useCallback(async (build: () => Promise<ApprovalNotification>) => {
    if (!settings.notifications) return
    try {
      const { eventType, data } = await build()
      await triggerNotification(eventType, data, settings.notifications)
    } catch (e) {
      console.error('Approval notification failed:', e)
    }
  }, [settings.notifications])

  // ─── Actions ─────────────────────────────────────────────────

  const requestApproval = useCallback(
    async (brief: BriefPayload, emailName: string, stages: ApprovalStageConfig[], startStage = 1) => {
      if (!profile) throw new Error('Not authenticated')
      const record = await requestApprovalService({ briefId: brief.meta.briefId, emailName, stages, startStage })
      await load()
      void send(async () => requestedNotification(record, await approversOf(record.id), await personFor(record.requestedBy)))
      return record
    },
    [profile, load, send, approversOf, personFor]
  )

  const decide = useCallback(
    async (approvalId: string, decision: Decision, comment: string) => {
      if (!profile) throw new Error('Not authenticated')
      let decided: ApprovalRecord
      try {
        decided = await decideApproval({ id: approvalId, decision, comment })
      } catch (e) {
        // A refused decision usually means someone else got there first, so the list is brought up to date before the reason is shown.
        await load()
        throw e
      }
      const list = await load()

      void send(async () => decisionNotification(decided, decision, await personFor(decided.requestedBy)))

      // Approved with stages still to go: the next stage is now waiting on its approvers.
      if (decision === 'approved' && decided.stage < decided.totalStages) {
        const next = list?.find((a) =>
          a.briefId === decided.briefId && a.round === decided.round && a.stage === decided.stage + 1 && a.status === 'pending')
        if (next) void send(async () => requestedNotification(next, await approversOf(next.id), await personFor(next.requestedBy)))
      }
    },
    [profile, load, send, approversOf, personFor]
  )

  const approve = useCallback((approvalId: string, comment: string) => decide(approvalId, 'approved', comment), [decide])
  const reject = useCallback((approvalId: string, comment: string) => decide(approvalId, 'rejected', comment), [decide])
  const requestChanges = useCallback(
    (approvalId: string, comment: string) => decide(approvalId, 'changes_requested', comment),
    [decide]
  )

  const withdraw = useCallback(
    async (approvalId: string, reason = '') => {
      if (!profile) throw new Error('Not authenticated')
      let withdrawn: ApprovalRecord
      try {
        withdrawn = await withdrawApproval({ id: approvalId, reason })
      } catch (e) {
        await load()
        throw e
      }
      await load()
      void send(async () => withdrawnNotification(withdrawn, await approversOf(withdrawn.id), reason))
    },
    [profile, load, send, approversOf]
  )

  const setPool = useCallback(
    async (role: ApprovalRole, userIds: string[]) => {
      await setApprovalPool(role, userIds)
      await load()
    },
    [load]
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
    (briefId: string) => latestApprovalForBrief(approvals, briefId),
    [approvals]
  )

  const getApprovalStatusForBrief = useCallback(
    (briefId: string): ApprovalStatus | 'none' => {
      const latest = getLatestApprovalForBrief(briefId)
      return latest?.status ?? 'none'
    },
    [getLatestApprovalForBrief]
  )

  const decisionBlockFor = useCallback(
    (approval: ApprovalRecord) => decisionBlock(approval, userId, pools),
    [userId, pools]
  )

  return (
    <ApprovalsContext.Provider
      value={{
        approvals,
        pools,
        overrides,
        awaitingMine: mineAwaiting,
        mySubmissions: mineSubmitted,
        decidedByMe: mineDecided,
        pendingCount: mineAwaiting.length,
        loading,
        error,
        decisionBlockFor,
        requestApproval,
        approve,
        reject,
        requestChanges,
        withdraw,
        setPool,
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
