import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFilters, activeFilterCount, DEFAULT_FILTERS } from './boardFilters.ts'
import type { KanbanCard } from '../types/kanban.types.ts'

const card = (over: Partial<KanbanCard>): KanbanCard => ({
  id: 'c1', briefId: 'b1', emailName: 'Important information', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: '',
  ...over,
})

const cards = [
  card({}),
  card({ id: 'c2', emailName: 'Advisor Impact', region: ['United Kingdom'], urgency: 'urgent', column: 'in-progress', assignee: 'Steven Jacobs', tags: 'fees' }),
  card({ id: 'c3', emailName: 'Women and Investing', emailType: 'newsletter', sendDate: '2030-03-01', submittedByName: 'Katie Tredoux' }),
]
const ids = (r: KanbanCard[]) => r.map((c) => c.id)

test('no filters keeps every card, in the order given', () => {
  assert.deepEqual(ids(applyFilters(cards, DEFAULT_FILTERS)), ['c1', 'c2', 'c3'])
  assert.equal(activeFilterCount(DEFAULT_FILTERS), 0)
})

test('search looks across name, assignee, submitter and tags, ignoring case', () => {
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, search: 'IMPACT' })), ['c2'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, search: 'steven' })), ['c2'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, search: 'tredoux' })), ['c3'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, search: 'fees' })), ['c2'])
})

test('filters combine: each one narrows the others', () => {
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, region: 'South Africa' })), ['c1', 'c3'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, region: 'South Africa', emailType: 'newsletter' })), ['c3'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, column: 'in-progress', urgency: 'urgent' })), ['c2'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, sendDateFrom: '2030-02-01' })), ['c3'])
  assert.deepEqual(ids(applyFilters(cards, { ...DEFAULT_FILTERS, sendDateTo: '2030-02-01' })), ['c1', 'c2'])
})

test('the filter count counts each filter that is set, search included', () => {
  assert.equal(activeFilterCount({ ...DEFAULT_FILTERS, search: 'x', region: 'South Africa' }), 2)
})
