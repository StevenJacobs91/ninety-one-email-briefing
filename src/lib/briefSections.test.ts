import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRIEF_SECTIONS, sectionForField, sectionProgress, type BriefSectionId } from './briefSections.ts'
import { getStepFields } from './validateStep.ts'
import type { BriefFormData } from './schema.ts'

const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'campaign', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

test('every field checked before Continue belongs to a section: the panel\'s own fields to the panel, the builder\'s to the email', () => {
  for (const path of getStepFields('build')) {
    const id = sectionForField(path)
    assert.ok(id, `${path} has a section`)
    // The logo variant and the hero image are chosen in the builder's inspector, not in the brief panel.
    if (path.startsWith('assets.')) assert.equal(id, 'email', `${path} is the email's`)
    else assert.notEqual(id, 'email', `${path} is the panel's`)
  }
})

test('a field belongs to one section, and the email\'s own fields are the email\'s', () => {
  const seen = new Map<string, BriefSectionId>()
  for (const [id, def] of Object.entries(BRIEF_SECTIONS) as [BriefSectionId, { fields: readonly string[] }][]) {
    for (const f of def.fields) {
      assert.ok(!seen.has(f), `${f} is in both ${seen.get(f)} and ${id}`)
      seen.set(f, id)
    }
  }
  assert.equal(sectionForField('content.headline'), 'email')
  assert.equal(sectionForField('content.cta.label'), 'email')
  assert.equal(sectionForField('assets.heroImageUrl'), 'email')
  assert.equal(sectionForField('assets.attachments'), 'materials')
  assert.equal(sectionForField('audience.pardotListId'), 'audience')
  assert.equal(sectionForField('campaign.subjectLine'), 'envelope')
  assert.equal(sectionForField('campaign.theme'), 'identity')
  assert.equal(sectionForField('something.else'), null)
})

test('the panel puts the email identity first and each section once, in order', () => {
  const orders = Object.values(BRIEF_SECTIONS).map((s) => s.order)
  assert.equal(new Set(orders).size, orders.length)
  assert.equal(BRIEF_SECTIONS.identity.order, Math.min(...orders))
})

test('a brand-new brief is part way along: fields with defaults are done, the rest are not, optional sections count nothing', () => {
  const p = sectionProgress(FRESH)
  assert.ok(p.identity.done < p.identity.total, 'the campaign name is missing')
  assert.ok(p.envelope.done < p.envelope.total)
  assert.ok(p.targeting.problems.length > 0)
  assert.equal(p.audience.total, 0)
  assert.equal(p.materials.total, 0)
})

test('filling a section in completes its badge, and the problems follow the field', () => {
  const filled = JSON.parse(JSON.stringify(FRESH)) as BriefFormData
  filled.campaign.subjectLine = 'Introducing our new online platform'
  filled.campaign.previewText = 'Passive investment products'
  const p = sectionProgress(filled)
  assert.deepEqual([p.envelope.done, p.envelope.total], [2, 2])
  assert.equal(p.envelope.problems.length, 0)
  filled.content.cta.url = 'not a link'
  const q = sectionProgress(filled)
  assert.ok(q.email.problems.some((x) => x.path === 'content.cta.url'), 'a problem in the email is counted under the email')
})
