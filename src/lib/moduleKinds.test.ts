import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describePickerModule, groupPickerModules, PICKER_GROUPS } from './moduleKinds.ts'

test('calls to action are grouped and know how many buttons they hold', () => {
  assert.deepEqual(describePickerModule('Single Primary CTA'), { group: 'Calls to action', kind: 'buttons', buttons: 1, blurb: 'One button' })
  assert.equal(describePickerModule('Primary and Secondary CTA').buttons, 2)
  assert.equal(describePickerModule('Dual Secondary CTA').buttons, 2)
  assert.equal(describePickerModule('1x Primary CTA 2x Secondary CTA').buttons, 3)
})

test('event modules stay with events even when they mention a CTA', () => {
  assert.equal(describePickerModule('Event Registration 2x CTA').group, 'Events')
  assert.equal(describePickerModule('Itinerary Table').group, 'Events')
})

test('modules are sorted into their groups by name', () => {
  const g = (n: string) => describePickerModule(n).group
  assert.equal(g('Numbered Section V2'), 'Content')
  assert.equal(g('Body Content List'), 'Content')
  assert.equal(g('Podcast Module'), 'Media')
  assert.equal(g('Video Play Rollover'), 'Media')
  assert.equal(g('Gallery V1'), 'Media')
  assert.equal(g('3x Speakers'), 'People')
  assert.equal(g('2x PM 3x CTA'), 'People')
  assert.equal(g('Dual Author Module V2'), 'People')
  assert.equal(g('Article List V3'), 'Articles')
  assert.equal(g('Tabs Anchors'), 'Navigation')
  assert.equal(g('Risk Warnings - UK'), 'Legal')
})

test('a module nobody planned for still gets a group and a picture', () => {
  assert.deepEqual(describePickerModule('Brand New Thing'), { group: 'Other', kind: 'generic', buttons: 0, blurb: '' })
})

test('grouping keeps the library order inside each group and drops empty groups', () => {
  const groups = groupPickerModules(['Single Primary CTA', 'Numbered Section V1', 'Dual Secondary CTA', 'Podcast Module'])
  assert.deepEqual(groups.map((x) => x.group), ['Content', 'Media', 'Calls to action'])
  assert.deepEqual(groups[2].names, ['Single Primary CTA', 'Dual Secondary CTA'])
  assert.ok(PICKER_GROUPS.indexOf('Content') < PICKER_GROUPS.indexOf('Calls to action'))
})

test('a module added in Settings is grouped by its category when its name says nothing', () => {
  assert.equal(describePickerModule('Promo Banner', 'Calls to action').group, 'Calls to action')
  assert.equal(describePickerModule('Promo Banner').group, 'Other')
  assert.equal(describePickerModule('Podcast Module', 'Content').group, 'Media')
  const groups = groupPickerModules(['Promo Banner', 'Numbered Section V1'], { 'Promo Banner': 'Events' })
  assert.deepEqual(groups.map((g) => [g.group, g.names]), [['Content', ['Numbered Section V1']], ['Events', ['Promo Banner']]])
})
