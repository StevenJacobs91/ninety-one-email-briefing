import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  awaitingMine, canManageApprovals, decidedByMe, decisionBlock, eligibleApprovers, friendlyApprovalError,
  latestApprovalForBrief, mySubmissions, resolveStages, stageIssues, describeStageIssue,
  briefApprovalState, parseDistributionBlock, DistributionBlockedError, DISTRIBUTION_BLOCK_MESSAGE,
} from './approvalRouting.ts'
import type { ApprovalConfig, ApprovalRecord, ApprovalStageConfig } from '../types/approval.types.ts'

const stage = (n: number, role: ApprovalStageConfig['role'], extra: Partial<ApprovalStageConfig> = {}): ApprovalStageConfig =>
  ({ stage: n, role, label: '', assignedUserId: null, dueDaysFromRequest: null, ...extra })

const approval = (extra: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'a1', teamId: 't', briefId: 'b1', emailName: 'E', status: 'pending',
  requestedBy: 'producer', requestedByName: 'P', requestedAt: '2026-10-26T10:00:00Z',
  decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null,
  approverRole: 'legal', approverUserId: null, dueDate: null, stage: 1, totalStages: 1,
  stagesSnapshot: [], round: 1, contentHash: null, stale: false, versionSnapshot: {}, createdAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z', ...extra,
})

const pools = { legal: ['lena', 'lou'], brand_guardian: ['bea'] }

test('stages come from the email type when it has its own, else from the defaults', () => {
  const config = {
    enabled: true, blockDistributionWithoutApproval: false,
    defaultStages: [stage(1, 'brand_guardian')],
    emailTypeConfigs: [{ emailType: 'newsletter', requireAllStages: true, stages: [stage(1, 'legal'), stage(2, 'manager')] }],
  } satisfies ApprovalConfig
  assert.deepEqual(resolveStages(config, 'newsletter').map((s) => s.role), ['legal', 'manager'])
  assert.deepEqual(resolveStages(config, 'operational').map((s) => s.role), ['brand_guardian'])
  assert.deepEqual(resolveStages(undefined, 'newsletter'), [])
})

test('a stage with a named approver is decided by that person alone; otherwise by anyone in the role’s pool', () => {
  assert.deepEqual(eligibleApprovers(stage(1, 'legal'), pools), ['lena', 'lou'])
  assert.deepEqual(eligibleApprovers(stage(1, 'legal', { assignedUserId: 'zed' }), pools), ['zed'])
  assert.deepEqual(eligibleApprovers(stage(1, 'manager'), pools), [])
})

test('someone in the pool can decide a pending approval', () => {
  assert.equal(decisionBlock(approval(), 'lena', pools), null)
})

test('someone outside the pool cannot, and is told so', () => {
  assert.equal(decisionBlock(approval(), 'stranger', pools), 'not_approver')
  assert.equal(decisionBlock(approval(), undefined, pools), 'not_approver')
})

test('the person who submitted it can never decide it, even if they are in the pool', () => {
  assert.equal(decisionBlock(approval({ requestedBy: 'lena' }), 'lena', pools), 'own_request')
})

test('a named approver can decide it, and a pool member cannot', () => {
  const named = approval({ approverUserId: 'zed' })
  assert.equal(decisionBlock(named, 'zed', pools), null)
  assert.equal(decisionBlock(named, 'lena', pools), 'not_approver')
})

test('an approval that has been decided cannot be decided again', () => {
  assert.equal(decisionBlock(approval({ status: 'approved' }), 'lena', pools), 'not_pending')
})

test('a stage nobody could decide is a problem, and so is one only the submitter could', () => {
  const issues = stageIssues([stage(1, 'brand_guardian'), stage(2, 'manager'), stage(3, 'legal')], pools, 'lena')
  assert.deepEqual(issues.map((i) => [i.stage, i.reason]), [[2, 'no_approver']])
  const onlyMe = stageIssues([stage(1, 'brand_guardian')], { brand_guardian: ['bea'] }, 'bea')
  assert.deepEqual(onlyMe.map((i) => i.reason), ['only_requester'])
  assert.deepEqual(stageIssues([stage(1, 'legal')], pools, 'producer'), [])
})

test('a stage problem is explained in plain words', () => {
  assert.match(describeStageIssue({ stage: 2, role: 'manager', reason: 'no_approver' }, 'Manager'), /Manager.*nobody/i)
  assert.match(describeStageIssue({ stage: 1, role: 'legal', reason: 'only_requester' }, 'Legal'), /only you/i)
})

test('each person sees what is waiting on them, what they submitted and what they decided', () => {
  const list = [
    approval({ id: '1' }),
    approval({ id: '2', approverRole: 'brand_guardian' }),
    approval({ id: '3', requestedBy: 'lena' }),
    approval({ id: '4', status: 'approved', decidedBy: 'lena' }),
  ]
  assert.deepEqual(awaitingMine(list, 'lena', pools).map((a) => a.id), ['1'])
  assert.deepEqual(awaitingMine(list, 'bea', pools).map((a) => a.id), ['2'])
  assert.deepEqual(awaitingMine(list, 'stranger', pools), [])
  assert.deepEqual(mySubmissions(list, 'lena').map((a) => a.id), ['3'])
  assert.deepEqual(decidedByMe(list, 'lena').map((a) => a.id), ['4'])
})

test('the current approval for a brief is the newest, so a second submission is not hidden behind the first’s later stage', () => {
  const list = [
    approval({ id: 'old-2', briefId: 'b1', stage: 2, totalStages: 2, status: 'approved', createdAt: '2026-10-20T10:00:00Z' }),
    approval({ id: 'new-1', briefId: 'b1', stage: 1, totalStages: 2, status: 'pending', createdAt: '2026-10-25T10:00:00Z' }),
    approval({ id: 'other', briefId: 'b2', createdAt: '2026-10-26T10:00:00Z' }),
  ]
  assert.equal(latestApprovalForBrief(list, 'b1')?.id, 'new-1')
  assert.equal(latestApprovalForBrief(list, 'none'), undefined)
})

test('managing approvals follows the role’s permission, on by default for admins and producers', () => {
  assert.equal(canManageApprovals('admin', undefined), true)
  assert.equal(canManageApprovals('producer', undefined), true)
  assert.equal(canManageApprovals('requester', undefined), false)
  assert.equal(canManageApprovals('producer', { producer: { canManageApprovals: false } }), false)
  assert.equal(canManageApprovals(undefined, undefined), false)
})

test('the database’s reasons are turned into plain messages', () => {
  assert.match(friendlyApprovalError('approval_already_decided'), /already been decided/i)
  assert.match(friendlyApprovalError('approval_own_request'), /submitted/i)
  assert.match(friendlyApprovalError('approval_not_approver'), /not one of the approvers/i)
  assert.match(friendlyApprovalError('comment_required'), /reason/i)
  assert.match(friendlyApprovalError('no_approver:legal', { legal: 'Legal' }), /Legal/)
  assert.match(friendlyApprovalError('approval_already_open'), /already waiting/i)
  assert.equal(friendlyApprovalError('something unexpected'), 'something unexpected')
})

// ─── Phase 2: where a brief stands ───────────────────────────────────────────

const rec = (id: string, stage: number, total: number, status: ApprovalRecord['status'], extra: Partial<ApprovalRecord> = {}) =>
  approval({ id, stage, totalStages: total, status, createdAt: `2026-10-26T10:0${stage}:00Z`, ...extra })

test('a brief nobody has submitted has no approval state', () => {
  assert.deepEqual(briefApprovalState([], 'b1'), { state: 'none' })
  assert.equal(briefApprovalState([rec('x', 1, 1, 'approved', { briefId: 'other' })], 'b1').state, 'none')
})

test('the newest record decides the state, and its round is the version', () => {
  const pending = briefApprovalState([rec('a', 1, 2, 'approved'), rec('b', 2, 2, 'pending', { round: 3 })], 'b1')
  assert.equal(pending.state, 'pending')
  assert.equal(pending.round, 3)
})

test('changes requested says which stage to resume at', () => {
  const result = briefApprovalState([rec('a', 1, 2, 'approved'), rec('b', 2, 2, 'changes_requested')], 'b1')
  assert.equal(result.state, 'changes_requested')
  assert.equal(result.resumeStage, 2)
})

test('rejected, withdrawn and closed-because-edited are each their own state', () => {
  assert.equal(briefApprovalState([rec('a', 1, 1, 'rejected')], 'b1').state, 'rejected')
  assert.equal(briefApprovalState([rec('a', 1, 1, 'withdrawn')], 'b1').state, 'withdrawn')
  assert.equal(briefApprovalState([rec('a', 1, 1, 'superseded')], 'b1').state, 'superseded')
})

test('approved needs every stage to have a decision that still covers the brief', () => {
  const both = [rec('a', 1, 2, 'approved'), rec('b', 2, 2, 'approved')]
  assert.equal(briefApprovalState(both, 'b1').state, 'approved')
})

test('an approval the brief has changed since is out of date, not approved', () => {
  const edited = [rec('a', 1, 2, 'approved', { stale: true }), rec('b', 2, 2, 'approved', { stale: true })]
  assert.equal(briefApprovalState(edited, 'b1').state, 'out_of_date')
  // One stage still current is not enough
  const half = [rec('a', 1, 2, 'approved'), rec('b', 2, 2, 'approved', { stale: true })]
  assert.equal(briefApprovalState(half, 'b1').state, 'out_of_date')
})

test('a stage approved in an earlier round and carried forward still counts', () => {
  const carried = [rec('a', 1, 2, 'approved', { round: 1, createdAt: '2026-10-25T10:00:00Z' }), rec('b', 2, 2, 'approved', { round: 2, createdAt: '2026-10-26T12:00:00Z' })]
  assert.equal(briefApprovalState(carried, 'b1').state, 'approved')
})

// ─── Phase 2: why a card cannot be distributed ───────────────────────────────

test('picks the reason out of the database refusal', () => {
  assert.equal(parseDistributionBlock('Failed to update kanban card: distribution_blocked:approval_pending'), 'approval_pending')
  assert.equal(parseDistributionBlock('distribution_blocked:not_submitted'), 'not_submitted')
  assert.equal(parseDistributionBlock('distribution_blocked:approval_stale'), 'approval_stale')
})

test('anything else is not a distribution block', () => {
  assert.equal(parseDistributionBlock('connection reset'), null)
  assert.equal(parseDistributionBlock('distribution_blocked:made_up_code'), null)
})

test('every block has a plain-words message, and the error carries it', () => {
  for (const [code, message] of Object.entries(DISTRIBUTION_BLOCK_MESSAGE)) {
    assert.ok(message.length > 10, code)
    assert.equal(new DistributionBlockedError(code as keyof typeof DISTRIBUTION_BLOCK_MESSAGE).message, message)
  }
})

test('the new database refusals are explained', () => {
  assert.match(friendlyApprovalError('withdraw_not_allowed'), /submitted this, or an admin/i)
  assert.match(friendlyApprovalError('invalid_start_stage'), /stage that asked for changes/i)
  assert.match(friendlyApprovalError('override_reason_required'), /10 characters/)
  assert.match(friendlyApprovalError('admin_only'), /Only admins/)
  assert.match(friendlyApprovalError('Failed to update kanban card: distribution_blocked:approval_rejected'), /rejected/i)
})
