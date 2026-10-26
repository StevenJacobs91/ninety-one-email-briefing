import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canRedo, canUndo, emptyHistory, record, redo, undo, HISTORY_LIMIT, type Snapshot } from './buildHistory.ts'

const snap = (n: number): Snapshot => ({ theme: `t${n}`, build: { version: 1, themeId: `t${n}`, modules: [] } })

test('a new history has nothing to undo or redo', () => {
  const h = emptyHistory()
  assert.equal(canUndo(h), false)
  assert.equal(canRedo(h), false)
})

test('undo returns the state before the last change and makes the current state redoable', () => {
  let h = record(emptyHistory(), snap(1), undefined, 0)
  h = record(h, snap(2), undefined, 10_000)
  const first = undo(h, snap(3))
  assert.equal(first.snapshot?.theme, 't2')
  assert.equal(canRedo(first.history), true)
  const second = undo(first.history, first.snapshot!)
  assert.equal(second.snapshot?.theme, 't1')
  assert.equal(canUndo(second.history), false)
})

test('redo reapplies what was undone, and a new change clears what could be redone', () => {
  let h = record(emptyHistory(), snap(1), undefined, 0)
  const u = undo(h, snap(2))
  const r = redo(u.history, u.snapshot!)
  assert.equal(r.snapshot?.theme, 't2')
  const again = undo(r.history, r.snapshot!)
  const changed = record(again.history, snap(9), undefined, 20_000)
  assert.equal(canRedo(changed), false)
})

test('undo and redo with nothing to go back to return no snapshot and leave the history alone', () => {
  const h = emptyHistory()
  assert.equal(undo(h, snap(1)).snapshot, null)
  assert.equal(redo(h, snap(1)).snapshot, null)
})

test('edits to the same region within half a second are one step, keeping the state before the first', () => {
  let h = record(emptyHistory(), snap(1), 'region:a:text', 1000)
  h = record(h, snap(2), 'region:a:text', 1300)
  h = record(h, snap(3), 'region:a:text', 1700)
  assert.equal(h.past.length, 1)
  assert.equal(undo(h, snap(4)).snapshot?.theme, 't1')
})

test('a pause, or a different region, starts a new step', () => {
  let h = record(emptyHistory(), snap(1), 'region:a:text', 1000)
  h = record(h, snap(2), 'region:a:text', 2000)
  h = record(h, snap(3), 'region:b:text', 2100)
  assert.equal(h.past.length, 3)
})

test('changes with no key are never merged', () => {
  let h = record(emptyHistory(), snap(1), undefined, 1000)
  h = record(h, snap(2), undefined, 1001)
  assert.equal(h.past.length, 2)
})

test('only the last 50 steps are kept', () => {
  let h = emptyHistory()
  for (let i = 0; i < HISTORY_LIMIT + 10; i++) h = record(h, snap(i), undefined, i * 10_000)
  assert.equal(h.past.length, HISTORY_LIMIT)
  assert.equal(h.past[0].theme, 't10')
})
