import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalStageConfig } from '../../types/approval.types'

const sb = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('../supabase', () => ({ supabase: sb }))

import {
  decideApproval, distributeWithOverride, getApprovalOverrides, getApprovalPools, getApprovalRecipients,
  requestApproval, setApprovalPool, withdrawApproval,
} from '../approvalsService'

const row = (extra: Record<string, unknown> = {}) => ({
  id: 'a1', team_id: 't', brief_id: 'b1', email_name: 'Taking Stock', status: 'pending',
  requested_by: 'paula', requested_by_name: 'Paula', requested_at: '2026-10-26T10:00:00Z',
  decided_by: null, decided_by_name: null, decided_at: null, decision_comment: null,
  approver_role: 'legal', approver_user_id: null, due_date: null, stage: 1, total_stages: 2,
  stages_snapshot: [{ stage: 1, role: 'legal' }, { stage: 2, role: 'manager' }],
  round: 1, content_hash: 'h1', stale: false, version_snapshot: {}, created_at: '2026-10-26T10:00:00Z', updated_at: '2026-10-26T10:00:00Z', ...extra,
})

const stages: ApprovalStageConfig[] = [
  { stage: 1, role: 'legal', label: '', assignedUserId: null, dueDaysFromRequest: 2 },
  { stage: 2, role: 'manager', label: '', assignedUserId: null, dueDaysFromRequest: null },
]

beforeEach(() => { sb.rpc.mockReset(); sb.from.mockReset() })

describe('submitting for approval', () => {
  it('goes through the database function, with the stages, and the database reads the brief itself', async () => {
    sb.rpc.mockResolvedValue({ data: row(), error: null })
    const record = await requestApproval({ briefId: 'b1', emailName: 'Taking Stock', stages })
    expect(sb.rpc).toHaveBeenCalledWith('request_approval', { p_brief_id: 'b1', p_email_name: 'Taking Stock', p_stages: stages, p_start_stage: 1 })
    expect(record.stagesSnapshot).toHaveLength(2)
    expect(record.status).toBe('pending')
  })

  it('does not ask the database when there are no stages', async () => {
    await expect(requestApproval({ briefId: 'b1', emailName: 'E', stages: [] })).rejects.toThrow(/at least one/i)
    expect(sb.rpc).not.toHaveBeenCalled()
  })

  it('says in plain words when the brief is already waiting for approval', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'approval_already_open' } })
    await expect(requestApproval({ briefId: 'b1', emailName: 'E', stages })).rejects.toThrow(/already waiting/i)
  })

  it('says which role has nobody to approve it', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'no_approver:legal' } })
    await expect(requestApproval({ briefId: 'b1', emailName: 'E', stages })).rejects.toThrow(/approve the Legal stage/)
  })

  it('keeps an unfamiliar database message, with what was being attempted', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'connection reset' } })
    await expect(requestApproval({ briefId: 'b1', emailName: 'E', stages })).rejects.toThrow('Failed to request approval: connection reset')
  })
})

describe('deciding', () => {
  it('goes through the database function, which also starts the next stage', async () => {
    sb.rpc.mockResolvedValue({ data: row({ status: 'approved' }), error: null })
    const record = await decideApproval({ id: 'a1', decision: 'approved', comment: 'Looks right' })
    expect(sb.rpc).toHaveBeenCalledWith('decide_approval', { p_id: 'a1', p_decision: 'approved', p_comment: 'Looks right' })
    expect(record.status).toBe('approved')
    // Only the one call: the client no longer inserts the next stage itself
    expect(sb.rpc).toHaveBeenCalledTimes(1)
    expect(sb.from).not.toHaveBeenCalled()
  })

  it.each([
    ['approval_already_decided', /already been decided/i],
    ['approval_own_request', /you submitted this brief/i],
    ['approval_not_approver', /not one of the approvers/i],
    ['comment_required', /give a reason/i],
  ])('explains a refusal: %s', async (code, message) => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: code } })
    await expect(decideApproval({ id: 'a1', decision: 'rejected', comment: 'x' })).rejects.toThrow(message)
  })
})

describe('approvers', () => {
  it('reads who may decide each role, grouped by role', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [
      { role: 'legal', user_id: 'lena' }, { role: 'legal', user_id: 'lou' }, { role: 'manager', user_id: 'mo' },
    ], error: null })
    sb.from.mockReturnValue({ select: () => ({ eq }) })
    const pools = await getApprovalPools('t')
    expect(sb.from).toHaveBeenCalledWith('approval_pool_members')
    expect(pools).toEqual({ legal: ['lena', 'lou'], manager: ['mo'] })
  })

  it('saves a role’s approvers through the admin-only function', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null })
    await setApprovalPool('legal', ['lena'])
    expect(sb.rpc).toHaveBeenCalledWith('set_approval_pool', { p_role: 'legal', p_user_ids: ['lena'] })
  })

  it('tells anyone but an admin that only admins can change them', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'admin_only' } })
    await expect(setApprovalPool('legal', ['lena'])).rejects.toThrow('Only admins can change who the approvers are.')
  })
})

describe('submitting again', () => {
  it('resumes at the stage that asked for changes', async () => {
    sb.rpc.mockResolvedValue({ data: row({ stage: 2, round: 2 }), error: null })
    const record = await requestApproval({ briefId: 'b1', emailName: 'Taking Stock', stages, startStage: 2 })
    expect(sb.rpc).toHaveBeenCalledWith('request_approval', { p_brief_id: 'b1', p_email_name: 'Taking Stock', p_stages: stages, p_start_stage: 2 })
    expect(record.round).toBe(2)
  })

  it('reads the round, the fingerprint and whether the decision is out of date', async () => {
    sb.rpc.mockResolvedValue({ data: row({ round: 3, content_hash: 'abc', stale: true }), error: null })
    const record = await requestApproval({ briefId: 'b1', emailName: 'E', stages })
    expect(record).toMatchObject({ round: 3, contentHash: 'abc', stale: true })
  })

  it('treats a row from before rounds existed as the first round, current', async () => {
    sb.rpc.mockResolvedValue({ data: row({ round: undefined, content_hash: undefined, stale: undefined }), error: null })
    const record = await requestApproval({ briefId: 'b1', emailName: 'E', stages })
    expect(record).toMatchObject({ round: 1, contentHash: null, stale: false })
  })

  it('explains a resume the database refused', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'invalid_start_stage' } })
    await expect(requestApproval({ briefId: 'b1', emailName: 'E', stages, startStage: 2 })).rejects.toThrow(/stage that asked for changes/)
  })
})

describe('withdrawing', () => {
  it('goes through the database function with the reason', async () => {
    sb.rpc.mockResolvedValue({ data: row({ status: 'withdrawn' }), error: null })
    const record = await withdrawApproval({ id: 'a1', reason: 'Wrong version' })
    expect(sb.rpc).toHaveBeenCalledWith('withdraw_approval', { p_id: 'a1', p_reason: 'Wrong version' })
    expect(record.status).toBe('withdrawn')
  })

  it('sends an empty reason when none is given', async () => {
    sb.rpc.mockResolvedValue({ data: row({ status: 'withdrawn' }), error: null })
    await withdrawApproval({ id: 'a1' })
    expect(sb.rpc).toHaveBeenCalledWith('withdraw_approval', { p_id: 'a1', p_reason: '' })
  })

  it.each([
    ['withdraw_not_allowed', /submitted this, or an admin/i],
    ['approval_already_decided', /already been decided/i],
  ])('explains a refusal: %s', async (code, message) => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: code } })
    await expect(withdrawApproval({ id: 'a1' })).rejects.toThrow(message)
  })
})

describe('who to tell', () => {
  it('reads the people who could decide an approval', async () => {
    sb.rpc.mockResolvedValue({ data: [{ user_id: 'lou', display_name: 'Lou', email: 'lou@x.com' }, { user_id: 'mo', display_name: null, email: null }], error: null })
    const people = await getApprovalRecipients('a1')
    expect(sb.rpc).toHaveBeenCalledWith('approval_recipients', { p_approval_id: 'a1' })
    expect(people).toEqual([{ userId: 'lou', displayName: 'Lou', email: 'lou@x.com' }, { userId: 'mo', displayName: '', email: '' }])
  })
})

describe('distributing without approval', () => {
  it('goes through the admin-only function with the reason', async () => {
    sb.rpc.mockResolvedValue({ data: {}, error: null })
    await distributeWithOverride({ cardId: 'c1', reason: 'Client confirmed by phone' })
    expect(sb.rpc).toHaveBeenCalledWith('distribute_with_override', { p_card_id: 'c1', p_reason: 'Client confirmed by phone' })
  })

  it.each([
    ['admin_only', /Only admins/],
    ['override_reason_required', /10 characters/],
    ['already_distributed', /already been distributed/],
  ])('explains a refusal: %s', async (code, message) => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: code } })
    await expect(distributeWithOverride({ cardId: 'c1', reason: 'long enough reason' })).rejects.toThrow(message)
  })

  it('reads the overrides on record, newest first', async () => {
    const order = vi.fn().mockResolvedValue({ data: [
      { id: 'o1', brief_id: 'b1', actor_name: 'Ada', reason: 'Client asked', blocked_for: 'approval_pending', created_at: '2026-10-27T10:00:00Z' },
    ], error: null })
    const eq = vi.fn().mockReturnValue({ order })
    sb.from.mockReturnValue({ select: () => ({ eq }) })
    const list = await getApprovalOverrides('t')
    expect(sb.from).toHaveBeenCalledWith('approval_overrides')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(list).toEqual([{ id: 'o1', briefId: 'b1', actorName: 'Ada', reason: 'Client asked', blockedFor: 'approval_pending', createdAt: '2026-10-27T10:00:00Z' }])
  })
})
