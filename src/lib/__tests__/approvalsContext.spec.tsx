// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalRecord } from '../../types/approval.types'
import type { BriefPayload } from '../../types/brief.types'

const svc = vi.hoisted(() => ({
  requestApproval: vi.fn(), decideApproval: vi.fn(), withdrawApproval: vi.fn(), getApprovalRecipients: vi.fn(),
  getApprovalOverrides: vi.fn(), getApprovals: vi.fn(), getApprovalPools: vi.fn(),
  setApprovalPool: vi.fn(), addComment: vi.fn(), getComments: vi.fn(), resolveComment: vi.fn(),
}))
vi.mock('../approvalsService', () => svc)
const notify = vi.hoisted(() => ({ triggerNotification: vi.fn() }))
vi.mock('../notificationService', () => notify)
const queries = vi.hoisted(() => ({ fetchTeamMembers: vi.fn() }))
vi.mock('../supabaseQueries', () => queries)
const auth = vi.hoisted(() => ({ value: { profile: { id: 'lena', teamId: 't', displayName: 'Lena', role: 'producer' } } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
const settingsMock = vi.hoisted(() => ({ value: { settings: { approvals: { enabled: true }, notifications: { enabled: true } } as Record<string, unknown> } }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => settingsMock.value }))

import { ApprovalsProvider, useApprovals } from '../../contexts/ApprovalsContext'

type Ctx = ReturnType<typeof useApprovals>
let ctx: Ctx
function Probe() {
  ctx = useApprovals()
  return null
}

const approval = (extra: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'a1', teamId: 't', briefId: 'b1', emailName: 'E', status: 'pending',
  requestedBy: 'paula', requestedByName: 'Paula', requestedAt: '2026-10-26T10:00:00Z',
  decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null,
  approverRole: 'legal', approverUserId: null, dueDate: null, stage: 1, totalStages: 1,
  stagesSnapshot: [], round: 1, contentHash: null, stale: false, versionSnapshot: {},
  createdAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z', ...extra,
})

const brief = { meta: { briefId: 'b9' } } as unknown as BriefPayload

async function mount() {
  render(<ApprovalsProvider><Probe /></ApprovalsProvider>)
  await act(async () => { await Promise.resolve() })
}

/** Notifications are sent after the action returns, so let those settle. */
async function flush() {
  for (let i = 0; i < 12; i++) await act(async () => { await Promise.resolve() })
}

const sent = () => notify.triggerNotification.mock.calls.map((c) => ({ event: c[0] as string, data: c[1] as Record<string, unknown> }))

beforeEach(() => {
  Object.values(svc).forEach((fn) => fn.mockReset())
  notify.triggerNotification.mockReset().mockResolvedValue({ success: true })
  queries.fetchTeamMembers.mockReset().mockResolvedValue([
    { id: 'paula', displayName: 'Paula', email: 'paula@ninetyone.com' },
    { id: 'lena', displayName: 'Lena', email: 'lena@ninetyone.com' },
  ])
  svc.getApprovals.mockResolvedValue([])
  svc.getApprovalPools.mockResolvedValue({})
  svc.getApprovalOverrides.mockResolvedValue([])
  svc.getApprovalRecipients.mockResolvedValue([{ userId: 'lou', displayName: 'Lou', email: 'lou@ninetyone.com' }])
  settingsMock.value = { settings: { approvals: { enabled: true }, notifications: { enabled: true } } }
})
afterEach(cleanup)

describe('the approvals context', () => {
  it('counts what is waiting on the signed-in person, not on the team', async () => {
    svc.getApprovals.mockResolvedValue([
      approval({ id: '1' }),
      approval({ id: '2', approverRole: 'manager' }),
      approval({ id: '3', requestedBy: 'lena' }),
    ])
    svc.getApprovalPools.mockResolvedValue({ legal: ['lena'], manager: ['mo'] })
    await mount()
    expect(ctx.approvals).toHaveLength(3)
    expect(ctx.pendingCount).toBe(1)
    expect(ctx.awaitingMine.map((a) => a.id)).toEqual(['1'])
    expect(ctx.mySubmissions.map((a) => a.id)).toEqual(['3'])
  })

  it('says why someone cannot decide an approval', async () => {
    svc.getApprovals.mockResolvedValue([approval({ id: '1' }), approval({ id: '3', requestedBy: 'lena' })])
    svc.getApprovalPools.mockResolvedValue({ legal: ['lena'] })
    await mount()
    expect(ctx.decisionBlockFor(approval({ id: '1' }))).toBeNull()
    expect(ctx.decisionBlockFor(approval({ id: '3', requestedBy: 'lena' }))).toBe('own_request')
  })

  it('decides through the service, then brings the list up to date', async () => {
    svc.decideApproval.mockResolvedValue(approval({ status: 'approved' }))
    await mount()
    const before = svc.getApprovals.mock.calls.length
    await act(async () => { await ctx.approve('a1', 'Fine') })
    expect(svc.decideApproval).toHaveBeenCalledWith({ id: 'a1', decision: 'approved', comment: 'Fine' })
    expect(svc.getApprovals.mock.calls.length).toBeGreaterThan(before)
  })

  it('brings the list up to date even when the decision is refused, and passes the reason on', async () => {
    svc.decideApproval.mockRejectedValue(new Error('This approval has already been decided.'))
    await mount()
    const before = svc.getApprovals.mock.calls.length
    await act(async () => {
      await expect(ctx.reject('a1', 'Not suitable')).rejects.toThrow(/already been decided/)
    })
    expect(svc.getApprovals.mock.calls.length).toBeGreaterThan(before)
    expect(notify.triggerNotification).not.toHaveBeenCalled()
  })

  it('sends only the name, the stages and where to start when submitting; the database reads the brief and says who submitted', async () => {
    svc.requestApproval.mockResolvedValue(approval())
    await mount()
    await act(async () => { await ctx.requestApproval(brief, 'Taking Stock', []) })
    expect(svc.requestApproval).toHaveBeenCalledWith({ briefId: 'b9', emailName: 'Taking Stock', stages: [], startStage: 1 })
  })

  it('resubmits at the stage that asked for changes', async () => {
    svc.requestApproval.mockResolvedValue(approval({ stage: 2, totalStages: 2, round: 2 }))
    await mount()
    await act(async () => { await ctx.requestApproval(brief, 'Taking Stock', [], 2) })
    expect(svc.requestApproval).toHaveBeenCalledWith({ briefId: 'b9', emailName: 'Taking Stock', stages: [], startStage: 2 })
  })

  it('shows the newest approval for a brief as its status', async () => {
    svc.getApprovals.mockResolvedValue([
      approval({ id: 'old', briefId: 'b1', stage: 2, totalStages: 2, status: 'approved', createdAt: '2026-10-20T10:00:00Z' }),
      approval({ id: 'new', briefId: 'b1', stage: 1, totalStages: 2, status: 'pending', createdAt: '2026-10-25T10:00:00Z' }),
    ])
    await mount()
    expect(ctx.getLatestApprovalForBrief('b1')?.id).toBe('new')
    expect(ctx.getApprovalStatusForBrief('b1')).toBe('pending')
    expect(ctx.getApprovalStatusForBrief('nope')).toBe('none')
  })

  it('lets an admin save who the approvers are, then reloads', async () => {
    svc.setApprovalPool.mockResolvedValue(undefined)
    await mount()
    const before = svc.getApprovalPools.mock.calls.length
    await act(async () => { await ctx.setPool('legal', ['lena']) })
    expect(svc.setApprovalPool).toHaveBeenCalledWith('legal', ['lena'])
    expect(svc.getApprovalPools.mock.calls.length).toBeGreaterThan(before)
  })

  it('still loads approvals when the list of overrides cannot be read', async () => {
    svc.getApprovals.mockResolvedValue([approval({ id: '1' })])
    svc.getApprovalOverrides.mockRejectedValue(new Error('relation does not exist'))
    await mount()
    expect(ctx.approvals).toHaveLength(1)
    expect(ctx.overrides).toEqual([])
    expect(ctx.error).toBeNull()
  })
})

describe('telling people what happened', () => {
  it('tells the approvers when a brief is submitted', async () => {
    svc.requestApproval.mockResolvedValue(approval({ requestedBy: 'paula' }))
    await mount()
    await act(async () => { await ctx.requestApproval(brief, 'Taking Stock', []) })
    await flush()
    expect(svc.getApprovalRecipients).toHaveBeenCalledWith('a1')
    expect(sent()).toHaveLength(1)
    expect(sent()[0].event).toBe('approval_requested')
    expect(sent()[0].data).toMatchObject({ campaignName: 'E', toEmails: 'lou@ninetyone.com', requesterEmail: 'paula@ninetyone.com' })
  })

  it('tells the requester when a stage is approved, and the next stage’s approvers that it is waiting on them', async () => {
    const decided = approval({ stage: 1, totalStages: 2, status: 'approved', decidedByName: 'Lou', decidedAt: '2026-10-26T11:00:00Z' })
    svc.decideApproval.mockResolvedValue(decided)
    svc.getApprovals.mockResolvedValue([
      decided,
      approval({ id: 'a2', stage: 2, totalStages: 2, approverRole: 'manager', status: 'pending' }),
    ])
    await mount()
    await act(async () => { await ctx.approve('a1', 'Fine') })
    await flush()
    const events = sent().map((s) => s.event)
    expect(events).toContain('approval_approved')
    expect(events).toContain('approval_requested')
    const approved = sent().find((s) => s.event === 'approval_approved')!
    expect(approved.data).toMatchObject({ toEmails: 'paula@ninetyone.com', approvedBy: 'Lou', final: false })
    const next = sent().find((s) => s.event === 'approval_requested')!
    expect(next.data).toMatchObject({ stage: 2, toEmails: 'lou@ninetyone.com' })
    expect(svc.getApprovalRecipients).toHaveBeenCalledWith('a2')
  })

  it('does not ask the next stage’s approvers anything after the final approval', async () => {
    svc.decideApproval.mockResolvedValue(approval({ stage: 1, totalStages: 1, status: 'approved' }))
    await mount()
    await act(async () => { await ctx.approve('a1', 'Fine') })
    await flush()
    expect(sent().map((s) => s.event)).toEqual(['approval_approved'])
    expect(sent()[0].data.final).toBe(true)
  })

  it('tells the requester when changes are requested, with the reason', async () => {
    svc.decideApproval.mockResolvedValue(approval({ status: 'changes_requested', decidedByName: 'Lou', decisionComment: 'Fix the disclaimer' }))
    await mount()
    await act(async () => { await ctx.requestChanges('a1', 'Fix the disclaimer') })
    await flush()
    expect(sent()).toHaveLength(1)
    expect(sent()[0].event).toBe('approval_changes_requested')
    expect(sent()[0].data).toMatchObject({ reason: 'Fix the disclaimer', requestedBy: 'Lou', toEmails: 'paula@ninetyone.com' })
  })

  it('tells the requester when a brief is rejected', async () => {
    svc.decideApproval.mockResolvedValue(approval({ status: 'rejected', decidedByName: 'Lou', decisionComment: 'Not suitable' }))
    await mount()
    await act(async () => { await ctx.reject('a1', 'Not suitable') })
    await flush()
    expect(sent()[0].event).toBe('approval_rejected')
    expect(sent()[0].data).toMatchObject({ rejectedBy: 'Lou', reason: 'Not suitable' })
  })

  it('withdraws through the service and tells the approvers who were waiting', async () => {
    svc.withdrawApproval.mockResolvedValue(approval({ status: 'withdrawn', decidedByName: 'Paula' }))
    await mount()
    await act(async () => { await ctx.withdraw('a1', 'Wrong version') })
    await flush()
    expect(svc.withdrawApproval).toHaveBeenCalledWith({ id: 'a1', reason: 'Wrong version' })
    expect(sent()).toHaveLength(1)
    expect(sent()[0].event).toBe('approval_withdrawn')
    expect(sent()[0].data).toMatchObject({ withdrawnBy: 'Paula', reason: 'Wrong version', toEmails: 'lou@ninetyone.com' })
  })

  it('brings the list up to date and passes the reason on when a withdrawal is refused', async () => {
    svc.withdrawApproval.mockRejectedValue(new Error('Only the person who submitted this, or an admin, can withdraw it.'))
    await mount()
    const before = svc.getApprovals.mock.calls.length
    await act(async () => { await expect(ctx.withdraw('a1')).rejects.toThrow(/Only the person who submitted/) })
    expect(svc.getApprovals.mock.calls.length).toBeGreaterThan(before)
    expect(notify.triggerNotification).not.toHaveBeenCalled()
  })

  it('never lets a failed notification undo or fail what was done', async () => {
    notify.triggerNotification.mockRejectedValue(new Error('flow is down'))
    svc.decideApproval.mockResolvedValue(approval({ status: 'approved' }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mount()
    await act(async () => { await expect(ctx.approve('a1', 'Fine')).resolves.toBeUndefined() })
    await flush()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('sends nothing when notifications are not set up', async () => {
    settingsMock.value = { settings: { approvals: { enabled: true } } }
    svc.decideApproval.mockResolvedValue(approval({ status: 'approved' }))
    await mount()
    await act(async () => { await ctx.approve('a1', 'Fine') })
    await flush()
    expect(notify.triggerNotification).not.toHaveBeenCalled()
  })
})
