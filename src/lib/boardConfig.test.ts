import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BOARD_VIEWS, CARD_FIELDS, defaultCardFields, fieldsForSurface, moveCardField, resolveBoardSettings,
  resolveCardFields, toggleCardField,
} from './boardConfig.ts'

const ids = CARD_FIELDS.map((f) => f.id)

test('the registry has unique field ids', () => {
  assert.equal(new Set(ids).size, ids.length)
})

test('with nothing saved, fields come in registry order and only the default-on ones are visible', () => {
  const resolved = resolveCardFields(undefined)
  assert.deepEqual(resolved.map((f) => f.id), ids)
  assert.deepEqual(resolved.filter((f) => f.visible).map((f) => f.id), CARD_FIELDS.filter((f) => f.defaultOn).map((f) => f.id))
})

test('a saved order is honoured, unknown ids are dropped and fields added later are appended', () => {
  const resolved = resolveCardFields({ order: ['tags', 'gone', 'region'], hidden: [] })
  assert.deepEqual(resolved.slice(0, 2).map((f) => f.id), ['tags', 'region'])
  assert.equal(resolved.length, ids.length)
  assert.ok(!resolved.some((f) => f.id === 'gone'))
})

test('a duplicate id in a saved order appears once', () => {
  const resolved = resolveCardFields({ order: ['tags', 'tags'], hidden: [] })
  assert.equal(resolved.filter((f) => f.id === 'tags').length, 1)
})

test('hiding and showing a field toggles it without changing the order', () => {
  const base = defaultCardFields()
  const hidden = toggleCardField(base, 'region')
  assert.ok(hidden.hidden.includes('region'))
  assert.deepEqual(hidden.order, base.order)
  assert.ok(!toggleCardField(hidden, 'region').hidden.includes('region'))
})

test('moving a field up or down swaps it with its neighbour and stops at the ends', () => {
  const base = defaultCardFields()
  const down = moveCardField(base, ids[0], 1)
  assert.deepEqual(down.order.slice(0, 2), [ids[1], ids[0]])
  assert.deepEqual(moveCardField(base, ids[0], -1).order, base.order)
  assert.deepEqual(moveCardField(base, ids[ids.length - 1], 1).order, base.order)
})

test('the board is on by default and keeps all four views', () => {
  const s = resolveBoardSettings(undefined)
  assert.equal(s.enabled, true)
  assert.deepEqual(s.enabledViews, [...BOARD_VIEWS])
  assert.equal(s.defaultView, 'kanban')
  assert.equal(s.density, 'comfortable')
})

test('a saved board can be switched off', () => {
  assert.equal(resolveBoardSettings({ enabled: false } as never).enabled, false)
})

test('at least one view stays on, and the default view is always one that is on', () => {
  assert.deepEqual(resolveBoardSettings({ enabledViews: [] } as never).enabledViews, [...BOARD_VIEWS])
  const s = resolveBoardSettings({ enabledViews: ['list', 'calendar'], defaultView: 'kanban' } as never)
  assert.equal(s.defaultView, 'list')
})

test('at least one column stays on', () => {
  assert.equal(resolveBoardSettings({ visibleColumns: [] } as never).visibleColumns.length, 3)
})

test('the old Show Assignee and Show Progress switches carry over when no card fields were saved', () => {
  const s = resolveBoardSettings({ showAssignee: false, showProgress: false } as never)
  const visible = fieldsForSurface(s, 'card')
  assert.ok(!visible.includes('assignee'))
  assert.ok(!visible.includes('progress'))
})

test('card fields saved by the new settings win over the old switches', () => {
  const s = resolveBoardSettings({ showAssignee: false, cardFields: { order: ['assignee'], hidden: [] } } as never)
  assert.ok(fieldsForSurface(s, 'card').includes('assignee'))
})

test('the list uses the card fields unless it has its own', () => {
  const card = { order: ['tags', 'region'], hidden: ids.filter((i) => i !== 'tags' && i !== 'region') }
  const list = { order: ['sendDate'], hidden: ids.filter((i) => i !== 'sendDate') }
  const shared = resolveBoardSettings({ cardFields: card, listFields: list, separateListFields: false } as never)
  assert.deepEqual(fieldsForSurface(shared, 'list'), ['tags', 'region'])
  const separate = resolveBoardSettings({ cardFields: card, listFields: list, separateListFields: true } as never)
  assert.deepEqual(fieldsForSurface(separate, 'list'), ['sendDate'])
  assert.deepEqual(fieldsForSurface(separate, 'card'), ['tags', 'region'])
})

import { groupFields } from './boardConfig.ts'

test('consecutive fields of the same kind share one row, in the configured order', () => {
  const groups = groupFields(['urgency', 'emailType', 'region', 'channel', 'progress', 'ageInColumn', 'comments'])
  assert.deepEqual(groups, [
    { kind: 'chip', ids: ['urgency', 'emailType'] },
    { kind: 'cell', ids: ['region', 'channel'] },
    { kind: 'block', ids: ['progress'] },
    { kind: 'meta', ids: ['ageInColumn', 'comments'] },
  ])
})

test('moving a field between kinds starts a new row', () => {
  const groups = groupFields(['region', 'theme', 'channel'])
  assert.deepEqual(groups.map((g) => g.kind), ['cell', 'block', 'cell'])
})

test('every field in the registry has a kind', () => {
  for (const f of CARD_FIELDS) assert.ok(['chip', 'cell', 'block', 'meta'].includes(f.kind), f.id)
})

import { applyColumnOrder, moveColumn } from './boardConfig.ts'

test('with no saved order the columns keep their default order', () => {
  assert.deepEqual(applyColumnOrder(['a', 'b', 'c'], undefined), ['a', 'b', 'c'])
  assert.deepEqual(applyColumnOrder(['a', 'b', 'c'], []), ['a', 'b', 'c'])
})

test('a saved order is followed, ignoring columns that are no longer shown', () => {
  assert.deepEqual(applyColumnOrder(['a', 'b', 'c'], ['c', 'z', 'a', 'b']), ['c', 'a', 'b'])
  assert.deepEqual(applyColumnOrder(['a', 'b'], ['b', 'b', 'a']), ['b', 'a'])
})

test('a column switched on since the order was saved appears next to its default neighbour', () => {
  assert.deepEqual(applyColumnOrder(['a', 'b', 'c'], ['c', 'a']), ['c', 'a', 'b'])
  assert.deepEqual(applyColumnOrder(['x', 'a', 'b'], ['b', 'a']), ['x', 'b', 'a'])
})

test('moving a column puts it in the slot of the column it is dropped on', () => {
  assert.deepEqual(moveColumn(['a', 'b', 'c'], 'a', 'c'), ['b', 'c', 'a'])
  assert.deepEqual(moveColumn(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b'])
  assert.deepEqual(moveColumn(['a', 'b', 'c'], 'b', 'b'), ['a', 'b', 'c'])
  assert.deepEqual(moveColumn(['a', 'b', 'c'], 'q', 'a'), ['a', 'b', 'c'])
})

test('attachments are a card field, shown by default, laid out as footer text', () => {
  const f = CARD_FIELDS.find((x) => x.id === 'attachments')!
  assert.ok(f)
  assert.equal(f.kind, 'meta')
  assert.equal(f.defaultOn, true)
})
