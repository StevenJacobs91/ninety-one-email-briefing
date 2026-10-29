import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activityToRow, cardToRow, rowToActivity, rowToCard, type KanbanCardRow } from './kanbanRows.ts'
import type { KanbanCard } from '../types/kanban.types'

const row: KanbanCardRow = {
  id: 'c1', team_id: 't1', brief_id: 'b1', email_name: 'Q3 update', email_type: 'campaign', theme: 'agulhas-coral',
  subject_line: 'Hello', region: ['UK'], channel: [], client_group: [], send_date: null, content_approval_date: null,
  urgency: 'standard', column: 'briefed', submitted_at: '2026-10-21T08:00:00Z', column_history: [], notes: '', tags: '',
  submitted_by_name: 'Ayesha Khan', submitted_by_email: 'ayesha.khan@ninetyone.com',
}

test('the submitter on a board row reaches the card', () => {
  const card = rowToCard(row)
  assert.equal(card.submittedByName, 'Ayesha Khan')
  assert.equal(card.submittedByEmail, 'ayesha.khan@ninetyone.com')
})

test('a row from before the submitter was recorded has no submitter', () => {
  const { submitted_by_name: _n, submitted_by_email: _e, ...old } = row
  const card = rowToCard(old)
  assert.equal(card.submittedByName, undefined)
  assert.equal(card.submittedByEmail, undefined)
})

test('the submitter is written back to the row', () => {
  const card: KanbanCard = rowToCard(row)
  const out = cardToRow(card, 't1')
  assert.equal(out.submitted_by_name, 'Ayesha Khan')
  assert.equal(out.submitted_by_email, 'ayesha.khan@ninetyone.com')
})

const files = [{ name: 'brief.pdf', size: 1200, type: 'application/pdf', path: 't1/b1/ab-brief.pdf' }]

test('a card carries the files attached to its brief', () => {
  const card = rowToCard({ ...row, attachments: files })
  assert.deepEqual(card.attachments, files)
})

test('a row from before attachments were recorded has none', () => {
  assert.deepEqual(rowToCard(row).attachments, [])
})

test('the attachments are written back to the row', () => {
  const card = rowToCard({ ...row, attachments: files })
  assert.deepEqual(cardToRow(card, 't1').attachments, files)
})

test('a change on a card is written as one row, owned by the person who made it, and read back as it was', () => {
  const entry = { id: 'a1', at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'subjectLine', label: 'Subject line', from: 'Hello', to: 'New' }
  const out = activityToRow(entry, 't1', 'c1', 'u1')
  assert.deepEqual(out, { id: 'a1', team_id: 't1', card_id: 'c1', actor_id: 'u1', actor_name: 'Sam', field: 'subjectLine', label: 'Subject line', from_value: 'Hello', to_value: 'New', created_at: '2026-10-29T10:00:00.000Z' })
  assert.deepEqual(rowToActivity({ ...out, id: 'a1' } as never), entry)
  const comment = { id: 'a2', at: '2026-10-29T10:01:00.000Z', by: 'Sam', field: 'comment', label: 'Comment', to: 'Hi' }
  assert.equal(activityToRow(comment, 't1', 'c1', 'u1').from_value, null)
  assert.ok(!('from' in rowToActivity(activityToRow(comment, 't1', 'c1', 'u1') as never)), 'an empty before is left out, not set to null')
})

test('a card with no files does not send the attachments column at all (the database defaults it to an empty list)', () => {
  const none = rowToCard(row)
  assert.ok(!('attachments' in cardToRow(none, 't1')))
  assert.ok(!('attachments' in cardToRow({ ...none, attachments: undefined }, 't1')))
})
