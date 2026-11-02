import { test } from 'node:test'
import assert from 'node:assert/strict'
import { briefProblems } from './briefProblems.ts'
import { getStepFields } from './validateStep.ts'
import type { BriefFormData } from './schema.ts'

// A brand-new, untouched brief, as useBriefForm creates one.
const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'campaign', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

const withValues = (over: (b: BriefFormData) => void): BriefFormData => {
  const copy = JSON.parse(JSON.stringify(FRESH)) as BriefFormData
  over(copy)
  return copy
}

test('an empty brief lists what is missing, so Continue always has something to say', () => {
  const problems = briefProblems(FRESH)
  assert.ok(problems.length > 0)
  assert.ok(problems.every((p) => p.field && p.message && p.path))
  assert.ok(problems.some((p) => p.path === 'campaign.campaignName'))
})

test('a brief that fails only in a field the builder owns still lists it, with a name and a path', () => {
  const full = withValues((b) => {
    b.campaign.campaignName = 'Corporate Solutions'
    b.campaign.subjectLine = 'Introducing our new online platform'
    b.campaign.previewText = 'Passive investment products'
    b.campaign.fromAddress = 'no-reply@ninetyone.com'
    b.campaign.replyToEmail = 'team@ninetyone.com'
    b.audience.clientGroup = ['Southern Africa'] as never
    b.audience.region = ['ZA'] as never
    b.audience.channel = ['INTERMEDIARY'] as never
    b.deadlines.contentApprovalDate = '2026-10-20'
    b.deadlines.sendDate = '2026-10-30'
    b.content.cta.url = 'not a link'
  })
  const problems = briefProblems(full)
  const link = problems.find((p) => p.path === 'content.cta.url')
  assert.ok(link, 'the button link is listed')
  assert.equal(link?.field, 'Button link')
  assert.match(link?.message ?? '', /valid URL/i)
  // None of the brief's own fields is among them, which is how Continue used to say nothing.
  assert.ok(!problems.some((p) => getStepFields('build').includes(p.path as never)))
})

test('a long button label is never a problem: it is a Brand Review suggestion, not a block', () => {
  const long = withValues((b) => {
    b.campaign.campaignName = 'Corporate Solutions'
    b.campaign.subjectLine = 'Introducing our new online platform'
    b.campaign.previewText = 'Passive investment products'
    b.campaign.fromAddress = 'no-reply@ninetyone.com'
    b.campaign.replyToEmail = 'team@ninetyone.com'
    b.audience.clientGroup = ['Southern Africa'] as never
    b.audience.region = ['ZA'] as never
    b.audience.channel = ['INTERMEDIARY'] as never
    b.deadlines.contentApprovalDate = '2026-10-20'
    b.deadlines.sendDate = '2026-10-30'
    b.content.cta.label = 'Read the full client notification letter and the fee schedule that comes with it'
  })
  assert.ok(!briefProblems(long).some((p) => p.path === 'content.cta.label'))
})

test('Brief & Build checks every field the Campaign step did, and nothing blocks the review tab itself', () => {
  assert.ok(getStepFields('build').includes('campaign.subjectLine'))
  assert.ok(getStepFields('build').includes('audience.region'))
  assert.deepEqual(getStepFields('campaign'), getStepFields('build'), 'the older name still works')
  assert.deepEqual(getStepFields('review'), [])
  assert.deepEqual(getStepFields(0), getStepFields('build'))
  assert.deepEqual(getStepFields(1), [])
})
