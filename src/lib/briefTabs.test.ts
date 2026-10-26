import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BRIEF_TABS, resolveTabs, mergeFormSteps, tabOrderForStepIndex } from './briefTabs.ts'
import { DEFAULT_FORM_STEPS } from './settingsDefaults.ts'

const ids = (s: { id: string }[]) => s.map((x) => x.id)

test('no saved steps yields the two fixed tabs', () => {
  assert.deepEqual(ids(resolveTabs(undefined)), ['build', 'review'])
  assert.deepEqual(ids(resolveTabs([])), ['build', 'review'])
})

test('older saved steps, three or two, resolve to the two tabs with the new labels', () => {
  const old = [
    { id: 'campaign', label: 'Campaign', order: 0, visible: true },
    { id: 'content', label: 'Content', order: 1, visible: true },
    { id: 'review', label: 'Brief Review', order: 2, visible: true },
  ]
  for (const saved of [old, old.slice(0, 2)]) {
    const tabs = resolveTabs(saved)
    assert.deepEqual(ids(tabs), ['build', 'review'])
    assert.deepEqual(tabs.map((t) => t.label), ['Brief & Build', 'Review and Submission'])
    assert.deepEqual(tabs.map((t) => t.order), [0, 1])
  }
})

test('a saved step marked hidden does not remove a tab', () => {
  const hidden = [
    { id: 'campaign', label: 'Campaign', order: 0, visible: true },
    { id: 'content', label: 'Content', order: 1, visible: false },
    { id: 'review', label: 'Brief Review', order: 2, visible: false },
  ]
  const tabs = resolveTabs(hidden)
  assert.equal(tabs.length, 2)
  assert.ok(tabs.every((t) => t.visible))
})

test('mergeFormSteps and the defaults agree with BRIEF_TABS', () => {
  assert.deepEqual(ids(mergeFormSteps(undefined)), BRIEF_TABS.map((t) => t.id))
  assert.deepEqual(ids(DEFAULT_FORM_STEPS), BRIEF_TABS.map((t) => t.id))
})

test('fields saved against the three old steps belong to the tab that now holds them', () => {
  assert.equal(tabOrderForStepIndex(0), 0, 'Campaign is Brief & Build')
  assert.equal(tabOrderForStepIndex(1), 0, 'Layout & Content is Brief & Build')
  assert.equal(tabOrderForStepIndex(2), 1, 'Review is still Review')
})
