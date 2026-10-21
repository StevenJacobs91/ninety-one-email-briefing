import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ageInColumn, sendStatus } from './boardFormat.ts'

const now = new Date('2026-10-21T12:00:00Z')

test('a send date in the past is overdue, within a week is due soon, later is ok', () => {
  assert.equal(sendStatus('2026-10-10', now), 'overdue')
  assert.equal(sendStatus('2026-10-25', now), 'due-soon')
  assert.equal(sendStatus('2026-12-01', now), 'ok')
})

test('no send date has no status to flag', () => {
  assert.equal(sendStatus('', now), 'ok')
})

test('a campaign that has been distributed is never flagged', () => {
  assert.equal(sendStatus('2026-10-10', now, 'distributed'), 'ok')
})

test('time in a column counts from the last move, in days or else hours', () => {
  const card = { columnHistory: [{ column: 'briefed', at: '2026-10-18T12:00:00Z' }], submittedAt: '2026-10-18T12:00:00Z' }
  assert.equal(ageInColumn(card, now), '3d')
  assert.equal(ageInColumn({ columnHistory: [], submittedAt: '2026-10-21T08:00:00Z' }, now), '4h')
})
