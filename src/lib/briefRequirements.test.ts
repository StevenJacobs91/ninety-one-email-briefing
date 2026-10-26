import { test } from 'node:test'
import assert from 'node:assert/strict'
import { briefSchema } from './schema.ts'
import { briefProblems } from './briefProblems.ts'
import { applyRequirements, defaultRequiredMap, isEmptyValue, REQUIRABLE_FIELDS, resolveRequired } from './briefRequirements.ts'
import { briefResolver } from './briefResolver.ts'
import type { BriefFormData } from './schema.ts'

const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'newsletter', campaignName: 'Taking Stock', theme: 'leatherback-coral', subjectLine: 'Hello', previewText: 'Preview', fromName: 'Ninety One', fromAddress: 'a@ninetyone.com', replyToEmail: '' },
  audience: { clientGroup: ['Advisor'], region: ['ZA'], channel: ['INTERMEDIARY'], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '2026-11-01', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

const withValue = (path: string, value: unknown): BriefFormData => {
  const copy = JSON.parse(JSON.stringify(FRESH)) as Record<string, Record<string, unknown>>
  const [group, key] = path.split('.')
  copy[group][key] = value
  return copy as unknown as BriefFormData
}

test('a field is empty when it has no text, no choices or no value', () => {
  for (const v of [undefined, null, '', '   ', []]) assert.equal(isEmptyValue(v), true)
  for (const v of ['x', ['a'], 0, false]) assert.equal(isEmptyValue(v), false)
})

test('the defaults say what the schema already requires', () => {
  const map = defaultRequiredMap()
  for (const path of ['campaign.subjectLine', 'campaign.previewText', 'campaign.fromAddress', 'audience.region', 'deadlines.sendDate']) assert.equal(map[path], true, path)
  for (const path of ['campaign.emailDescription', 'campaign.replyToEmail', 'deadlines.notes']) assert.equal(map[path], false, path)
})

test('with the defaults, nothing about the brief check changes', () => {
  const empty = withValue('campaign.subjectLine', '')
  assert.deepEqual(briefProblems(empty, defaultRequiredMap()).map((p) => p.path), briefProblems(empty).map((p) => p.path))
  assert.deepEqual(briefProblems(FRESH, defaultRequiredMap()), [])
})

test('a required field that the schema allows empty becomes a problem when it is empty', () => {
  const required = { ...defaultRequiredMap(), 'campaign.replyToEmail': true }
  const problems = briefProblems(FRESH, required)
  assert.deepEqual(problems.map((p) => p.path), ['campaign.replyToEmail'])
  assert.match(problems[0].message, /required/i)
  assert.deepEqual(briefProblems(withValue('campaign.replyToEmail', 'x@ninetyone.com'), required), [])
})

test('a field the schema requires stops blocking when it is made optional, but only while it is empty', () => {
  const optional = { ...defaultRequiredMap(), 'campaign.subjectLine': false, 'audience.region': false, 'campaign.fromAddress': false }
  assert.deepEqual(briefProblems(withValue('campaign.subjectLine', ''), optional), [])
  assert.deepEqual(briefProblems(withValue('audience.region', []), optional), [])
  assert.deepEqual(briefProblems(withValue('campaign.fromAddress', ''), optional), [])
  // A value that is there and wrong is still wrong
  assert.deepEqual(briefProblems(withValue('campaign.fromAddress', 'not-an-address'), optional).map((p) => p.path), ['campaign.fromAddress'])
})

test('other problems in the brief are untouched by an override', () => {
  const optional = { ...defaultRequiredMap(), 'campaign.subjectLine': false }
  const both = withValue('campaign.subjectLine', '')
  both.deadlines.sendDate = ''
  assert.deepEqual(briefProblems(both, optional).map((p) => p.path), ['deadlines.sendDate'])
})

test('saved choices are laid over the defaults, and unknown fields are ignored', () => {
  const map = resolveRequired({ 'campaign.replyToEmail': true, 'campaign.subjectLine': false, 'nonsense.field': true })
  assert.equal(map['campaign.replyToEmail'], true)
  assert.equal(map['campaign.subjectLine'], false)
  assert.equal('nonsense.field' in map, false)
  assert.equal(resolveRequired(undefined)['campaign.previewText'], true)
})

test('every field offered in Settings is a real path in the brief, listed once', () => {
  const paths = Object.values(REQUIRABLE_FIELDS).flat().map((f) => f.path)
  assert.equal(new Set(paths).size, paths.length)
  for (const path of paths) {
    const [group, key] = path.split('.')
    assert.ok(key in (FRESH as unknown as Record<string, Record<string, unknown>>)[group] || key === 'utmCampaign', path)
  }
})

test('the form resolver accepts what the overrides accept and reports what they report, field by field', async () => {
  const optional = { ...defaultRequiredMap(), 'campaign.subjectLine': false }
  const ok = await briefResolver(() => optional)(withValue('campaign.subjectLine', ''), undefined, {} as never)
  assert.deepEqual(ok.errors, {})
  const required = { ...defaultRequiredMap(), 'campaign.replyToEmail': true }
  const bad = await briefResolver(() => required)(FRESH, undefined, {} as never)
  assert.match((bad.errors as { campaign?: { replyToEmail?: { message?: string } } }).campaign?.replyToEmail?.message ?? '', /required/i)
  const plain = await briefResolver(() => defaultRequiredMap())(withValue('campaign.subjectLine', ''), undefined, {} as never)
  assert.ok((plain.errors as { campaign?: { subjectLine?: unknown } }).campaign?.subjectLine)
  assert.equal(briefSchema.safeParse(FRESH).success, true)
  assert.equal(typeof applyRequirements, 'function')
})

const withSender = (senderType: string, extra: Record<string, unknown> = {}): BriefFormData => {
  const copy = JSON.parse(JSON.stringify(FRESH)) as { campaign: Record<string, unknown> }
  Object.assign(copy.campaign, { senderType, fromName: '', fromAddress: '', specificUser: '', ...extra })
  return copy as unknown as BriefFormData
}

test('a general user sender needs a from name and address, and no specific user', () => {
  const problems = briefProblems(withSender('general'), defaultRequiredMap()).map((p) => p.path)
  assert.deepEqual(problems.sort(), ['campaign.fromAddress', 'campaign.fromName'])
})

test('an assigned user sender needs neither a from name nor a from address', () => {
  assert.deepEqual(briefProblems(withSender('assigned'), defaultRequiredMap()), [])
})

test('a specific user sender needs the user, and not a from name or address', () => {
  const missing = briefProblems(withSender('specific'), defaultRequiredMap())
  assert.deepEqual(missing.map((p) => p.path), ['campaign.specificUser'])
  assert.match(missing[0].message, /required/i)
  assert.deepEqual(briefProblems(withSender('specific', { specificUser: '12345' }), defaultRequiredMap()), [])
})

test('a brief saved before sender types existed is a general user sender', () => {
  assert.deepEqual(briefProblems(FRESH, defaultRequiredMap()), [])
  const legacy = withSender('general', { fromName: '', fromAddress: '' })
  delete (legacy.campaign as Record<string, unknown>).senderType
  assert.deepEqual(briefProblems(legacy, defaultRequiredMap()).map((p) => p.path).sort(), ['campaign.fromAddress', 'campaign.fromName'])
})

test('the form resolver follows the sender type too', async () => {
  const ok = await briefResolver(() => defaultRequiredMap())(withSender('assigned'), undefined, {} as never)
  assert.deepEqual(ok.errors, {})
})

test('a field switched off never blocks, even when it is empty and normally required', () => {
  const hidden = new Set(['campaign.subjectLine'])
  assert.deepEqual(briefProblems(withValue('campaign.subjectLine', ''), defaultRequiredMap(), hidden), [])
})

test('a field switched off is ignored even with a wrong value left in it, since there is nowhere to fix it', () => {
  const hidden = new Set(['campaign.replyToEmail'])
  assert.deepEqual(briefProblems(withValue('campaign.replyToEmail', 'not-an-address'), defaultRequiredMap(), hidden), [])
  assert.deepEqual(briefProblems(withValue('campaign.replyToEmail', 'not-an-address'), defaultRequiredMap()).map((p) => p.path), ['campaign.replyToEmail'])
})

test('a field switched off is not asked for even if the team made it required', () => {
  const required = { ...defaultRequiredMap(), 'campaign.replyToEmail': true }
  assert.deepEqual(briefProblems(FRESH, required, new Set(['campaign.replyToEmail'])), [])
})

test('switching one field off leaves every other problem as it was', () => {
  const both = withValue('campaign.subjectLine', '')
  both.deadlines.sendDate = ''
  assert.deepEqual(briefProblems(both, defaultRequiredMap(), new Set(['campaign.subjectLine'])).map((p) => p.path), ['deadlines.sendDate'])
})

test('the form resolver leaves out what is switched off too', async () => {
  const ok = await briefResolver(() => defaultRequiredMap(), () => new Set(['campaign.subjectLine']))(withValue('campaign.subjectLine', ''), undefined, {} as never)
  assert.deepEqual(ok.errors, {})
})
