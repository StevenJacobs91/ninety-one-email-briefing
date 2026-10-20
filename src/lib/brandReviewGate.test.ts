import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateGate, fieldToTab, shouldAutoRunAI } from './brandReviewGate.ts'
import { runBrandGuardianReview } from './brandGuardian.ts'
import type { BriefPayload } from '../types/brief.types'

// Mirrors createDefaultValues() in useBriefForm.ts: a brand-new, untouched brief.
const FRESH_BRIEF = {
  meta: { briefId: 'b', createdAt: '', updatedAt: '', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'campaign', campaignName: '', theme: 'leatherback-coral',
    subjectLine: '', previewText: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '',
    sections: [{ id: 's', heading: '', body: '', imageRequired: false, imageDescription: '' }],
    modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true },
    legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '',
    heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefPayload

const ok = { score: 90, minimumScore: 70, aiMode: 'off', aiStatus: 'idle', aiRejected: false }

test('a score at the minimum is not blocked', () => {
  assert.deepEqual(evaluateGate({ ...ok, score: 70 }), { blocked: false, reason: null })
})

test('a score under the minimum is blocked and the reason names both numbers', () => {
  const g = evaluateGate({ ...ok, score: 55 })
  assert.equal(g.blocked, true)
  assert.match(g.reason ?? '', /55/)
  assert.match(g.reason ?? '', /70/)
})

test('pre-submission AI mode blocks until the AI review has succeeded', () => {
  const g = evaluateGate({ ...ok, aiMode: 'pre-submission', aiStatus: 'running' })
  assert.equal(g.blocked, true)
  assert.match(g.reason ?? '', /AI review/i)
})

test('pre-submission AI mode blocks a rejected AI review', () => {
  const g = evaluateGate({ ...ok, aiMode: 'pre-submission', aiStatus: 'success', aiRejected: true })
  assert.equal(g.blocked, true)
})

test('pre-submission AI mode passes once the AI review succeeded and was not rejected', () => {
  assert.equal(evaluateGate({ ...ok, aiMode: 'pre-submission', aiStatus: 'success' }).blocked, false)
})

test('post-submission AI mode never blocks on the AI review', () => {
  assert.equal(evaluateGate({ ...ok, aiMode: 'post-submission', aiStatus: 'error', aiRejected: true }).blocked, false)
})

test('fieldToTab maps brief field paths onto tabs', () => {
  assert.equal(fieldToTab('campaign.subjectLine'), 'campaign')
  assert.equal(fieldToTab('deadlines.sendDate'), 'campaign')
  assert.equal(fieldToTab('content.headline'), 'content')
  assert.equal(fieldToTab('something.else'), null)
})

test('reviewing a brand-new, untouched brief produces a score and does not throw', () => {
  const r = runBrandGuardianReview(FRESH_BRIEF)
  assert.equal(typeof r.score, 'number')
})

test('the AI review auto-runs only once the user is on the review tab', () => {
  const base = { aiMode: 'pre-submission', aiAvailable: true, aiStatus: 'idle', onReviewTab: true }
  assert.equal(shouldAutoRunAI(base), true)
  assert.equal(shouldAutoRunAI({ ...base, onReviewTab: false }), false)
  assert.equal(shouldAutoRunAI({ ...base, aiMode: 'post-submission' }), true)
  assert.equal(shouldAutoRunAI({ ...base, aiMode: 'optional' }), false)
  assert.equal(shouldAutoRunAI({ ...base, aiAvailable: false }), false)
  assert.equal(shouldAutoRunAI({ ...base, aiStatus: 'success' }), false)
})
