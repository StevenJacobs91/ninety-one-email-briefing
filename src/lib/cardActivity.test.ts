import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commentEntry, detailEntries, historyEntries, metaEntries, textEntry } from './cardActivity.ts'
import type { KanbanCard } from '../types/kanban.types'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: ['Southern Africa'], sendDate: '2026-09-30', contentApprovalDate: '2026-04-20',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [{ column: 'briefed', at: '2026-10-20T08:00:00Z' }], notes: '', tags: 'a, b',
}
const now = new Date('2026-10-29T10:00:00Z')
const opts = { now, themeName: (id: string) => ({ 'agulhas-gold': 'Gold', 'agulhas-teal': 'Teal' })[id] ?? id }
const bare = <T extends { id: string }>(entries: T[]): Omit<T, 'id'>[] => entries.map(({ id, ...rest }) => { assert.ok(id, 'every entry has an id'); return rest })

test('a save of several fields records one entry for each field that really changed, in a fixed order', () => {
  const entries = detailEntries(card, {
    sendDate: '2026-10-05', subjectLine: 'New', theme: 'agulhas-teal', region: ['South Africa', 'Namibia'], contentApprovalDate: '', channel: ['Advisor'],
  }, 'Sam', opts)
  assert.deepEqual(bare(entries), [
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'subjectLine', label: 'Subject line', from: 'Hello', to: 'New' },
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'theme', label: 'Brand theme', from: 'Gold', to: 'Teal' },
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'region', label: 'Regions', from: 'South Africa', to: 'South Africa, Namibia' },
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'contentApprovalDate', label: 'Content approval', from: '20 Apr 2026', to: '—' },
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'sendDate', label: 'Send date', from: '30 Sep 2026', to: '5 Oct 2026' },
  ])
})

test('saving what is already there records nothing', () => {
  assert.deepEqual(detailEntries(card, { subjectLine: 'Hello', region: ['South Africa'], sendDate: '2026-09-30', tags: 'a, b' }, 'Sam', opts), [])
})

test('assignee, production start and progress are recorded when they change, and an empty assignee is the same as none', () => {
  assert.deepEqual(bare(metaEntries(card, { assignee: 'Amy', startDate: '2026-10-22', progress: 0 }, 'Sam', opts)), [
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'assignee', label: 'Assignee', from: '—', to: 'Amy' },
    { at: '2026-10-29T10:00:00.000Z', by: 'Sam', field: 'startDate', label: 'Production start', from: '—', to: '22 Oct 2026' },
  ])
  const assigned = { ...card, assignee: 'Amy', progress: 40 }
  assert.deepEqual(bare(metaEntries(assigned, { assignee: '', progress: 45 }, 'Sam', opts)).map((e) => [e.field, e.from, e.to]), [['assignee', 'Amy', '—'], ['progress', '40%', '45%']])
  assert.deepEqual(metaEntries({ ...card, assignee: undefined }, { assignee: '' }, 'Sam', opts), [])
  assert.deepEqual(metaEntries(assigned, { startDate: undefined }, 'Sam', opts), [], 'a field not given is not a change')
})

test('notes and comments are recorded in short, and unchanged notes are not recorded', () => {
  assert.equal(textEntry('notes', 'Notes', 'same', 'same', 'Sam', opts), null)
  const long = textEntry('notes', 'Notes', 'a'.repeat(400), 'b', 'Sam', opts)
  assert.equal(long?.from, `${'a'.repeat(200)}…`)
  assert.equal(long?.to, 'b')
  const c = commentEntry('x'.repeat(300), 'Sam', opts)
  assert.equal(c.field, 'comment')
  assert.equal(c.to, `${'x'.repeat(200)}…`)
})

test('the history reads moves and changes together, oldest first, saying who did each', () => {
  const full: KanbanCard = {
    ...card,
    columnHistory: [
      { column: 'briefed', at: '2026-10-20T10:00:00Z' },
      { column: 'in-progress', at: '2026-10-20T14:00:00Z', by: 'Sam' },
      { column: 'distributed', at: '2026-10-20T16:00:00Z', by: 'Admin', override: true },
    ],
    activity: [
      { id: 'a2', at: '2026-10-20T15:00:00Z', by: 'Amy', field: 'comment', label: 'Comment', to: 'Looks good' },
      { id: 'a1', at: '2026-10-20T12:00:00Z', by: 'Sam', field: 'subjectLine', label: 'Subject line', from: 'Hello', to: 'New' },
      { id: 'a3', at: '2026-10-20T15:30:00Z', by: 'Sam', field: 'notes', label: 'Notes', from: 'a', to: 'b' },
    ],
  }
  assert.deepEqual(historyEntries(full).map((h) => [h.title, h.detail, h.by]), [
    ['Added to Briefed', undefined, undefined],
    ['Subject line changed', 'Hello → New', 'Sam'],
    ['Moved to In Progress', undefined, 'Sam'],
    ['Comment added', 'Looks good', 'Amy'],
    ['Notes edited', 'a → b', 'Sam'],
    ['Moved to Distributed without the required approval', undefined, 'Admin'],
  ])
})

test('a card with no recorded changes still has its moves, and a card with neither has an empty history', () => {
  assert.deepEqual(historyEntries(card).map((h) => h.title), ['Added to Briefed'])
  assert.deepEqual(historyEntries({ ...card, columnHistory: [] }), [])
})
