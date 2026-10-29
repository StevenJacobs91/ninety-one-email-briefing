import { test } from 'node:test'
import assert from 'node:assert/strict'
import { briefWithEdits, cardWithEdits, checkCardEdits, localDate, producersFrom, productionStart } from './cardEdits.ts'
import { cardUpdatesToRow } from './kanbanRows.ts'
import type { KanbanCard } from '../types/kanban.types'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: ['Southern Africa'], sendDate: '2026-09-30', contentApprovalDate: '2026-04-20',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [{ column: 'briefed', at: '2026-10-20T08:00:00Z' }], notes: '', tags: 'a, b',
}

const brief = {
  meta: { briefId: 'b1', status: 'submitted', updatedAt: '2026-10-20T08:00:00Z' },
  campaign: { subjectLine: 'Hello', theme: 'agulhas-gold', campaignName: 'Advisor Impact' },
  audience: { clientGroup: ['Southern Africa'], region: ['South Africa'], channel: ['Advisor'] },
  deadlines: { contentApprovalDate: '2026-04-20', sendDate: '2026-09-30', tags: 'a, b', urgency: 'standard' },
  content: { headline: 'H' },
} as never

test('each edit lands on the brief field it belongs to, and nothing else on the brief changes', () => {
  const next = briefWithEdits(brief, {
    subjectLine: 'New subject', theme: 'agulhas-teal', clientGroup: ['Europe'], region: ['Germany'], channel: ['Institutional'],
    contentApprovalDate: '2026-05-01', sendDate: '2026-10-01', tags: 'x, y',
  }, new Date('2026-10-29T10:00:00Z')) as unknown as Record<string, Record<string, unknown>>
  assert.equal(next.campaign.subjectLine, 'New subject')
  assert.equal(next.campaign.theme, 'agulhas-teal')
  assert.equal(next.campaign.campaignName, 'Advisor Impact')
  assert.deepEqual(next.audience, { clientGroup: ['Europe'], region: ['Germany'], channel: ['Institutional'] })
  assert.deepEqual(next.deadlines, { contentApprovalDate: '2026-05-01', sendDate: '2026-10-01', tags: 'x, y', urgency: 'standard' })
  assert.deepEqual(next.content, { headline: 'H' })
  assert.equal(next.meta.updatedAt, '2026-10-29T10:00:00.000Z')
  assert.equal((brief as unknown as { campaign: { subjectLine: string } }).campaign.subjectLine, 'Hello', 'the original is not changed')
})

test('only the fields edited are touched, on the card as well', () => {
  const next = cardWithEdits(card, { tags: 'only tags' })
  assert.equal(next.tags, 'only tags')
  assert.equal(next.subjectLine, 'Hello')
  assert.deepEqual(next.region, ['South Africa'])
  assert.equal(cardWithEdits(card, {}).sendDate, '2026-09-30')
})

test('an edit that would leave the brief unusable is refused with a reason, and a good one passes', () => {
  assert.match(checkCardEdits(card, { subjectLine: '   ' }) ?? '', /subject line/i)
  assert.match(checkCardEdits(card, { clientGroup: [] }) ?? '', /client group/i)
  assert.match(checkCardEdits(card, { region: [] }) ?? '', /region/i)
  assert.match(checkCardEdits(card, { channel: [] }) ?? '', /channel/i)
  assert.match(checkCardEdits(card, { sendDate: '' }) ?? '', /send date/i)
  assert.equal(checkCardEdits(card, { contentApprovalDate: '' }), null, 'content approval is optional')
  assert.equal(checkCardEdits(card, { subjectLine: 'Fine', tags: '' }), null)
})

test('production starts the day the card moves to In Progress, and never overwrites a date someone set', () => {
  const now = new Date(2026, 9, 29, 23, 30)
  assert.equal(localDate(now), '2026-10-29', 'the local calendar day, not the UTC one')
  assert.equal(productionStart(card, 'in-progress', now), '2026-10-29')
  assert.equal(productionStart({ ...card, startDate: '2026-10-01' }, 'in-progress', now), undefined, 'a date already there is kept')
  assert.equal(productionStart(card, 'distributed', now), undefined)
  assert.equal(productionStart(card, 'briefed', now), undefined)
})

test('the producers to pick from are producers and admins, by name, in order, without repeats', () => {
  const m = (displayName: string, role: string) => ({ id: displayName, email: '', displayName, role, customRoleId: null, teamId: 't', createdAt: '', presetClientGroups: [], presetRegions: [] }) as never
  assert.deepEqual(producersFrom([m('Zed', 'producer'), m('Amy', 'admin'), m('Bob', 'requester'), m('Amy', 'producer'), m('', 'producer')]), ['Amy', 'Zed'])
})

test('the new card fields are written to their own columns, and an unedited field is left out', () => {
  assert.deepEqual(cardUpdatesToRow({ subjectLine: 'S', theme: 't', region: ['r'], channel: ['c'], clientGroup: ['g'], contentApprovalDate: '', sendDate: '2026-10-01', tags: 'x' }), {
    subject_line: 'S', theme: 't', region: ['r'], channel: ['c'], client_group: ['g'], content_approval_date: null, send_date: '2026-10-01', tags: 'x',
  })
  assert.deepEqual(cardUpdatesToRow({ notes: 'n' }), { notes: 'n' })
  assert.deepEqual(cardUpdatesToRow({}), {})
})
