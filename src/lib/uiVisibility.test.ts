import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isShown, VISIBILITY_OPTIONS } from './uiVisibility.ts'

test('an item with no saved value is shown', () => {
  assert.equal(isShown({}, 'showCopyHtml'), true)
  assert.equal(isShown(undefined, 'showSendTestEmail'), true)
})

test('an item saved as false is hidden and one saved as true is shown', () => {
  assert.equal(isShown({ showSubmitToPardot: false }, 'showSubmitToPardot'), false)
  assert.equal(isShown({ showSubmitToPardot: true }, 'showSubmitToPardot'), true)
})

test('hiding one item does not hide the others', () => {
  const saved = { showCopyHtml: false }
  assert.equal(isShown(saved, 'showSendTestEmail'), true)
  assert.equal(isShown(saved, 'showSubmitToPardot'), true)
})

test('the five requested controls are listed, grouped by tab', () => {
  const byTab = (tab: string) => VISIBILITY_OPTIONS.filter((o) => o.tab === tab).map((o) => o.key)
  assert.deepEqual(byTab('Campaign'), ['showDistributionListDropzone', 'showPardotProspectHealth'])
  assert.deepEqual(byTab('Review and Submission'), ['showCopyHtml', 'showSendTestEmail', 'showSubmitToPardot'])
})
