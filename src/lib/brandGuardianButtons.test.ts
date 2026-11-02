import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBrandGuardianReview } from './brandGuardian.ts'
import { DEFAULT_BRAND_GUARDIAN } from './settingsDefaults.ts'
import type { BriefPayload } from '../types/brief.types.ts'

const brief = (label = ''): BriefPayload => ({
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'newsletter', campaignName: 'Taking Stock', theme: 'leatherback-coral', subjectLine: 'Hello', previewText: 'Preview', replyToEmail: '', senderType: 'general', fromName: 'Ninety One', fromAddress: 'a@ninetyone.com' },
  audience: { clientGroup: ['Advisor'], region: ['ZA'], channel: ['INTERMEDIARY'], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label, url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '2026-11-01', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefPayload)

const LONG = 'Read the full client notification letter'

const lengthItems = (b: BriefPayload, opts: { buttonLabels?: string[]; max?: number } = {}) =>
  runBrandGuardianReview(b, { config: { ...DEFAULT_BRAND_GUARDIAN, ctaLabelMaxLength: opts.max ?? 25 }, buttonLabels: opts.buttonLabels })
    .items.filter((i) => i.category === 'Content Structure' && /character|chars/i.test(i.message) && i.field.startsWith('content.cta'))

test('a long button label is a suggestion in the review, never an error', () => {
  const items = lengthItems(brief(LONG))
  assert.equal(items.length, 1)
  assert.equal(items[0].severity, 'warning')
  assert.ok(items[0].message.includes(LONG))
  assert.ok(items[0].message.includes(`${LONG.length}`))
})

test('the suggestion points to making the button wider as well as shortening the text', () => {
  assert.match(lengthItems(brief(LONG))[0].message, /wider/i)
})

test('the length that triggers it is the one set in Settings, not a fixed 25', () => {
  assert.equal(lengthItems(brief(LONG), { max: 50 }).length, 0)
  assert.equal(lengthItems(brief('Read the letter'), { max: 10 }).length, 1)
  assert.equal(lengthItems(brief('Read the letter'), { max: 25 }).length, 0)
})

test('every button in the email is checked, not just the first', () => {
  const items = lengthItems(brief('Read letter'), { buttonLabels: ['Read letter', LONG, 'Download the complete fund fact sheet'] })
  assert.equal(items.length, 2)
  assert.ok(items.some((i) => i.message.includes(LONG)))
  assert.ok(items.some((i) => i.message.includes('Download the complete fund fact sheet')))
  assert.ok(items.every((i) => i.severity === 'warning'))
})

test('a short label, or no button at all, raises nothing', () => {
  assert.equal(lengthItems(brief('Read letter')).length, 0)
  assert.equal(lengthItems(brief('')).length, 0)
  assert.equal(lengthItems(brief(''), { buttonLabels: [] }).length, 0)
})

test('the same long label is not reported twice when it is also the first button', () => {
  assert.equal(lengthItems(brief(LONG), { buttonLabels: [LONG] }).length, 1)
})
