import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GROUP_OPTIONS, groupCards, progressFromClick, stepProgress } from './boardGrouping.ts'

// Thursday 22 October 2026
const NOW = new Date('2026-10-22T10:00:00')

const card = (over: Record<string, unknown> = {}) => ({
  id: 'x', emailName: 'E', emailType: 'newsletter', region: ['South Africa'], channel: ['Advisor'], urgency: 'standard',
  column: 'briefed', sendDate: '2026-10-23', submittedByName: 'Admin', assignee: '', ...over,
}) as never

const labels = (cards: unknown[], field: Parameters<typeof groupCards>[1]) => groupCards(cards as never, field, NOW).map((g) => g.label)

test('every field the board can group by is offered, none first', () => {
  assert.deepEqual(GROUP_OPTIONS.map((o) => o.label), ['None', 'Stage', 'Urgency', 'Type', 'Submitted by', 'Assignee', 'Region', 'Channel', 'Status', 'Send date'])
})

test('with no grouping there is one unlabelled group of everything', () => {
  const groups = groupCards([card(), card({ id: 'y' })] as never, 'none', NOW)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].label, '')
  assert.equal(groups[0].cards.length, 2)
})

test('stages come in board order, and empty stages are left out', () => {
  assert.deepEqual(labels([card({ column: 'distributed' }), card({ column: 'briefed' })], 'column'), ['Briefed', 'Distributed'])
})

test('urgent comes before standard', () => {
  assert.deepEqual(labels([card(), card({ urgency: 'urgent' })], 'urgency'), ['Urgent', 'Standard'])
})

test('type, submitter and channel group by their value, alphabetically, with blanks last', () => {
  assert.deepEqual(labels([card({ emailType: 'newsletter' }), card({ emailType: '' }), card({ emailType: 'campaign' })], 'emailType'), ['campaign', 'newsletter', 'No type'])
  assert.deepEqual(labels([card({ submittedByName: 'Zed' }), card({ submittedByName: undefined }), card({ submittedByName: 'Amy' })], 'submittedBy'), ['Amy', 'Zed', 'Unknown'])
  assert.deepEqual(labels([card({ assignee: 'Steven' }), card({ assignee: '' })], 'assignee'), ['Steven', 'Unassigned'])
})

test('a card in several regions sits in one group named by all of them, so counts add up', () => {
  const groups = groupCards([card({ region: ['UK', 'EU'] }), card({ region: ['UK', 'EU'] }), card({ region: ['ZA'] })] as never, 'region', NOW)
  assert.deepEqual(groups.map((g) => [g.label, g.cards.length]), [['UK · EU', 2], ['ZA', 1]])
})

test('status groups overdue, due soon and on track, and a distributed campaign is never overdue', () => {
  const cards = [
    card({ sendDate: '2026-10-01' }),
    card({ sendDate: '2026-10-25' }),
    card({ sendDate: '2027-02-01' }),
    card({ sendDate: '2026-10-01', column: 'distributed' }),
  ]
  assert.deepEqual(groupCards(cards as never, 'sendStatus', NOW).map((g) => [g.label, g.cards.length]), [['Overdue', 1], ['Due soon', 1], ['On track', 2]])
})

test('send dates are grouped by this week, next week, next month, this quarter and next quarter', () => {
  const at = (sendDate: string) => card({ sendDate, emailName: sendDate })
  const cards = [
    at('2026-10-05'), // before this week
    at('2026-10-23'), // this week (Mon 19 – Sun 25)
    at('2026-10-31'), // next week (Mon 26 – Sun 1 Nov)
    at('2026-11-15'), // next month
    at('2026-12-10'), // this quarter (Oct – Dec)
    at('2027-01-15'), // next quarter
    at('2027-07-01'), // later
    at(''), // none
  ]
  const groups = groupCards(cards as never, 'sendDate', NOW)
  assert.deepEqual(groups.map((g) => g.label), ['Earlier', 'This week', 'Next week', 'Next month', 'This quarter', 'Next quarter', 'Later', 'No send date'])
  assert.deepEqual(groups.map((g) => (g.cards[0] as unknown as { emailName: string }).emailName), ['2026-10-05', '2026-10-23', '2026-10-31', '2026-11-15', '2026-12-10', '2027-01-15', '2027-07-01', ''])
})

test('the end of this month falls into next week or this quarter, never nowhere', () => {
  assert.deepEqual(labels([card({ sendDate: '2026-11-01' })], 'sendDate'), ['Next week'])
  assert.deepEqual(labels([card({ sendDate: '2026-10-29' })], 'sendDate'), ['Next week'])
})

test('the week runs Monday to Sunday', () => {
  const sunday = new Date('2026-10-25T09:00:00')
  assert.deepEqual(groupCards([card({ sendDate: '2026-10-25' }), card({ sendDate: '2026-10-26' })] as never, 'sendDate', sunday).map((g) => g.label), ['This week', 'Next week'])
})

test('a click on a progress bar becomes the nearest ten per cent', () => {
  assert.equal(progressFromClick(0, 100), 0)
  assert.equal(progressFromClick(74, 100), 70)
  assert.equal(progressFromClick(76, 100), 80)
  assert.equal(progressFromClick(100, 100), 100)
  assert.equal(progressFromClick(-5, 100), 0)
  assert.equal(progressFromClick(180, 100), 100)
  assert.equal(progressFromClick(50, 0), 0)
})

test('the arrow keys move progress by ten and stop at the ends', () => {
  assert.equal(stepProgress(70, 1), 80)
  assert.equal(stepProgress(70, -1), 60)
  assert.equal(stepProgress(100, 1), 100)
  assert.equal(stepProgress(0, -1), 0)
  assert.equal(stepProgress(65, 1), 70)
  assert.equal(stepProgress(65, -1), 60)
})
