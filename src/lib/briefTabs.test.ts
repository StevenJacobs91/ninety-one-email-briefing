import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRIEF_TABS, resolveTabs, clampTab, mergeFormSteps } from './briefTabs.ts'
import { DEFAULT_FORM_STEPS } from './settingsDefaults.ts'

const ids = (s: { id: string }[]) => s.map((x) => x.id)

test('no saved steps yields the three fixed tabs', () => {
  assert.deepEqual(ids(resolveTabs(undefined)), ['campaign', 'content', 'review'])
  assert.deepEqual(ids(resolveTabs([])), ['campaign', 'content', 'review'])
})

test('old saved steps resolve to three tabs with the new labels', () => {
  const old = [
    { id: 'campaign', label: 'Campaign', order: 0, visible: true },
    { id: 'content', label: 'Content', order: 1, visible: true },
    { id: 'review', label: 'Brief Review', order: 2, visible: true },
  ]
  const tabs = resolveTabs(old)
  assert.deepEqual(ids(tabs), ['campaign', 'content', 'review'])
  assert.deepEqual(tabs.map((t) => t.label), ['Campaign', 'Layout & Content', 'Review and Submission'])
})

test('a saved step marked hidden does not remove a tab', () => {
  const hidden = [
    { id: 'campaign', label: 'Campaign', order: 0, visible: true },
    { id: 'content', label: 'Content', order: 1, visible: false },
    { id: 'review', label: 'Brief Review', order: 2, visible: false },
  ]
  const tabs = resolveTabs(hidden)
  assert.equal(tabs.length, 3)
  assert.ok(tabs.every((t) => t.visible))
})

test('clampTab keeps an index inside the tab range', () => {
  assert.equal(clampTab(5, 3), 2)
  assert.equal(clampTab(-1, 3), 0)
  assert.equal(clampTab(1, 3), 1)
})

test('mergeFormSteps and the defaults agree with BRIEF_TABS', () => {
  assert.deepEqual(ids(mergeFormSteps(undefined)), BRIEF_TABS.map((t) => t.id))
  assert.deepEqual(ids(DEFAULT_FORM_STEPS), BRIEF_TABS.map((t) => t.id))
})
