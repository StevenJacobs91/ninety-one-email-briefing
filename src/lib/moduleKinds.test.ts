import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultImageCategory, describePickerModule, groupPickerModules, isLayoutIcon, LAYOUT_ICONS, PICKER_GROUPS } from './moduleKinds.ts'

test('a module\'s pictures start in the media library category that suits it: Images for articles, Profiles for people, else Graphics', () => {
  assert.equal(defaultImageCategory('Article List V3', 'Articles'), 'images')
  assert.equal(defaultImageCategory('Investment Views Article List', 'Content'), 'images', 'a module filed elsewhere but named for articles')
  assert.equal(defaultImageCategory('Promo Banner', 'Articles'), 'images', 'a module filed under Articles')
  assert.equal(defaultImageCategory('3x Speakers', 'People'), 'profile')
  assert.equal(defaultImageCategory('Promo Banner', 'Content'), 'graphics')
})

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

test('a layout icon chosen in Settings replaces the one the name suggests, and leaves the group and wording alone', () => {
  const named = describePickerModule('Promo Banner', 'Content')
  assert.equal(named.kind, 'generic')
  const chosen = describePickerModule('Promo Banner', 'Content', 'imageLeft')
  assert.deepEqual(chosen, { ...named, kind: 'imageLeft', buttons: 0 })
  assert.equal(describePickerModule('Event Registration 2x CTA', 'Other', 'quote').kind, 'quote')
  assert.equal(describePickerModule('Event Registration 2x CTA').kind, 'event', 'with none chosen the name decides')
  assert.equal(describePickerModule('Promo Banner', 'Content', 'buttons').buttons, 1)
  assert.equal(describePickerModule('Dual Secondary CTA', 'Other', 'buttons').buttons, 2)
})

test('every offered layout icon is a known kind, once', () => {
  const kinds = LAYOUT_ICONS.map((i) => i.kind)
  assert.equal(new Set(kinds).size, kinds.length)
  assert.ok(kinds.every((k) => isLayoutIcon(k)))
  assert.equal(isLayoutIcon('nonsense'), false)
  assert.equal(isLayoutIcon(undefined), false)
})

test('a module nobody planned for still gets a group and a picture', () => {
  assert.deepEqual(describePickerModule('Brand New Thing'), { group: 'Other', kind: 'generic', buttons: 0, blurb: '' })
})

test('grouping keeps the library order inside each group and drops empty groups', () => {
  const groups = groupPickerModules(['Single Primary CTA', 'Numbered Section V1', 'Dual Secondary CTA', 'Podcast Module'])
  assert.deepEqual(groups.map((x) => x.group), ['Content', 'Calls to action', 'Media'])
  assert.deepEqual(groups[1].names, ['Single Primary CTA', 'Dual Secondary CTA'])
  assert.ok(PICKER_GROUPS.indexOf('Content') < PICKER_GROUPS.indexOf('Calls to action'))
})

test('a category chosen in Settings wins over the group the name suggests, and the order is the one in Settings', () => {
  const names = ['Single Primary CTA', 'Numbered Section V1', 'Podcast Module']
  const order = ['Media', 'Promo', 'Calls to action', 'Content', 'Other']
  const groups = groupPickerModules(names, {}, order, { 'Single Primary CTA': 'Promo' })
  assert.deepEqual(groups.map((g) => [g.group, g.names]), [['Media', ['Podcast Module']], ['Promo', ['Single Primary CTA']], ['Content', ['Numbered Section V1']]])
})

test('a module whose category has been deleted goes to Other, so it is never lost from the picker', () => {
  const groups = groupPickerModules(['Podcast Module', 'Promo Banner'], {}, ['Content', 'Other'], { 'Promo Banner': 'Deleted category' })
  assert.deepEqual(groups.map((g) => [g.group, g.names]), [['Other', ['Podcast Module', 'Promo Banner']]])
})

test('a module added in Settings is grouped by its category when its name says nothing', () => {
  assert.equal(describePickerModule('Promo Banner', 'Calls to action').group, 'Calls to action')
  assert.equal(describePickerModule('Promo Banner').group, 'Other')
  assert.equal(describePickerModule('Podcast Module', 'Content').group, 'Media')
  const groups = groupPickerModules(['Promo Banner', 'Numbered Section V1'], { 'Promo Banner': 'Events' })
  assert.deepEqual(groups.map((g) => [g.group, g.names]), [['Content', ['Numbered Section V1']], ['Events', ['Promo Banner']]])
})
