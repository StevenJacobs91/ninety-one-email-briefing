import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeModule } from './describe.ts'
import { parse, readModule } from './fixtures.ts'

const info = (name: string) => describeModule(name, readModule(name), parse)

test('header fields are labelled Headline and Sub-headline', () => {
  assert.deepEqual(info('Header with Image').fields.map((f) => f.label), ['Headline', 'Sub-headline'])
})

test('the Greeting module is locked to the greetings setting', () => {
  const f = info('Greeting').fields
  assert.ok(f.length > 0 && f.every((x) => x.locked))
})

test('other modules are not locked', () => {
  assert.ok(info('Body Content').fields.every((x) => !x.locked))
})

test('repeating units are labelled by item and numbered', () => {
  const labels = info('Article List').fields.map((f) => f.label)
  assert.ok(labels.some((l) => l.startsWith('Item 1')))
  assert.ok(labels.some((l) => l.startsWith('Item 3')))
})

test('a button is labelled Button and an image Image', () => {
  assert.equal(info('Single Primary CTA').fields[0].label, 'Button')
  assert.ok(info('3x Speakers').fields.some((f) => f.label.startsWith('Image')))
})

test('placeholder images and repeat groups are reported', () => {
  assert.ok(info('Header with Image').images.length >= 1)
  assert.equal(info('Article List').repeats[0].units, 3)
  assert.equal(info('Gallery V1').fields.length, 0)
})

test('describing with repeat counts reflects the resized module', () => {
  const resized = describeModule('Article List', readModule('Article List'), parse, { subheading: 5 })
  assert.equal(resized.repeats[0].units, 5)
  assert.ok(resized.fields.some((f) => f.label.startsWith('Item 5')))
})
