import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decisionNotification, overrideNotification, requestedNotification, withdrawnNotification } from './approvalNotifications.ts'
import type { ApprovalRecord } from '../types/approval.types.ts'

const approval = (extra: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'a1', teamId: 't', briefId: 'b1', emailName: 'Taking Stock', status: 'pending',
  requestedBy: 'paula', requestedByName: 'Paula', requestedAt: '2026-10-26T10:00:00Z',
  decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null,
  approverRole: 'legal', approverUserId: null, dueDate: '2026-10-28T10:00:00Z', stage: 1, totalStages: 2,
  stagesSnapshot: [], round: 1, contentHash: null, stale: false, versionSnapshot: {},
  createdAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z', ...extra,
})

const lou = { name: 'Lou', email: 'lou@ninetyone.com' }
const lena = { name: 'Lena', email: 'lena@ninetyone.com' }
const paula = { name: 'Paula', email: 'paula@ninetyone.com' }

test('a request goes to the approvers, naming the stage, the role and the due date', () => {
  const n = requestedNotification(approval(), [lou, lena], paula)
  assert.equal(n.eventType, 'approval_requested')
  assert.equal(n.data.toEmails, 'lou@ninetyone.com, lena@ninetyone.com')
  assert.equal(n.data.approverRole, 'Legal')
  assert.equal(n.data.campaignName, 'Taking Stock')
  assert.equal(n.data.dueDate, '2026-10-28T10:00:00Z')
  assert.equal(n.data.requesterEmail, 'paula@ninetyone.com')
  assert.equal(n.data.stage, 1)
  assert.equal(n.data.totalStages, 2)
})

test('approvers without an email address are left out of the list rather than leaving a gap', () => {
  const n = requestedNotification(approval(), [lou, { name: 'No Email', email: '' }])
  assert.equal(n.data.toEmails, 'lou@ninetyone.com')
})

test('an approval goes to the requester, and says whether it was the last stage', () => {
  const middle = decisionNotification(approval({ status: 'approved', decidedByName: 'Lou' }), 'approved', paula)
  assert.equal(middle.eventType, 'approval_approved')
  assert.equal(middle.data.toEmails, 'paula@ninetyone.com')
  assert.equal(middle.data.approvedBy, 'Lou')
  assert.equal(middle.data.final, false)
  const last = decisionNotification(approval({ stage: 2, status: 'approved' }), 'approved', paula)
  assert.equal(last.data.final, true)
})

test('a rejection and a request for changes carry the reason', () => {
  const rejected = decisionNotification(approval({ status: 'rejected', decidedByName: 'Lou', decisionComment: 'Not suitable' }), 'rejected', paula)
  assert.equal(rejected.eventType, 'approval_rejected')
  assert.equal(rejected.data.reason, 'Not suitable')
  assert.equal(rejected.data.rejectedBy, 'Lou')
  const changes = decisionNotification(approval({ status: 'changes_requested', decidedByName: 'Lou', decisionComment: 'Fix the disclaimer' }), 'changes_requested', paula)
  assert.equal(changes.eventType, 'approval_changes_requested')
  assert.equal(changes.data.reason, 'Fix the disclaimer')
  assert.equal(changes.data.requestedBy, 'Lou')
})

test('a decision for a requester whose address is unknown still sends, with an empty address', () => {
  const n = decisionNotification(approval({ status: 'approved' }), 'approved')
  assert.equal(n.data.toEmails, '')
})

test('a withdrawal goes to the approvers who were waiting, with the reason', () => {
  const n = withdrawnNotification(approval({ status: 'withdrawn', decidedByName: 'Paula' }), [lou], 'Wrong version')
  assert.equal(n.eventType, 'approval_withdrawn')
  assert.equal(n.data.toEmails, 'lou@ninetyone.com')
  assert.equal(n.data.withdrawnBy, 'Paula')
  assert.equal(n.data.reason, 'Wrong version')
})

test('an override names who did it and why', () => {
  const n = overrideNotification({ emailName: 'Taking Stock', briefId: 'b1', overriddenBy: 'Ada', reason: 'Client asked by phone', requester: paula })
  assert.equal(n.eventType, 'approval_overridden')
  assert.equal(n.data.overriddenBy, 'Ada')
  assert.equal(n.data.reason, 'Client asked by phone')
  assert.equal(n.data.toEmails, 'paula@ninetyone.com')
})
