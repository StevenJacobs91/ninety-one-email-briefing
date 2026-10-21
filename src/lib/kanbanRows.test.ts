import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardToRow, rowToCard, type KanbanCardRow } from './kanbanRows.ts'
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
