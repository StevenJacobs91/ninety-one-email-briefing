import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MOVABLE_SECTIONS, moveSection, resolveSectionOrder, sectionOrderMap, resolveFieldOrder, fieldPositions, resolveHidden } from './briefLayout.ts'

test('with nothing saved the sections are in their built-in order', () => {
  assert.deepEqual(resolveSectionOrder(undefined), ['identity', 'envelope', 'sender', 'targeting', 'audience', 'deadlines', 'materials', 'tags'])
  assert.deepEqual(resolveSectionOrder([]), resolveSectionOrder(undefined))
})

test('a saved order is kept', () => {
  const saved = ['deadlines', 'identity', 'envelope', 'sender', 'targeting', 'audience', 'materials', 'tags']
  assert.deepEqual(resolveSectionOrder(saved), saved)
})

test('a section missing from a saved order is added at the end, and unknown or repeated ones are dropped', () => {
  const order = resolveSectionOrder(['tags', 'identity', 'bogus', 'identity'])
  assert.deepEqual(order.slice(0, 2), ['tags', 'identity'])
  assert.equal(order.length, MOVABLE_SECTIONS.length)
  assert.equal(new Set(order).size, order.length)
  assert.ok(!order.includes('bogus' as never))
})

test('a section moves up or down one place, and stays put at either end', () => {
  const start = resolveSectionOrder(undefined)
  assert.deepEqual(moveSection(start, 'sender', -1).slice(0, 3), ['identity', 'sender', 'envelope'])
  assert.deepEqual(moveSection(start, 'identity', 1).slice(0, 2), ['envelope', 'identity'])
  assert.deepEqual(moveSection(start, 'identity', -1), start)
  assert.deepEqual(moveSection(start, 'tags', 1), start)
  assert.notEqual(moveSection(start, 'sender', -1), start)
})

test('the order becomes a position for each section, with the email builder after them all', () => {
  const map = sectionOrderMap(['deadlines', 'identity', 'envelope', 'sender', 'targeting', 'audience', 'materials', 'tags'])
  assert.equal(map.deadlines, 1)
  assert.equal(map.identity, 2)
  assert.ok(map.email > map.tags)
})

test('with nothing saved a section lists its fields in their built-in order', () => {
  assert.deepEqual(resolveFieldOrder('identity', undefined), ['campaign.emailType', 'campaign.theme', 'campaign.campaignName', 'campaign.emailDescription', 'campaign.utmCampaign'])
  assert.deepEqual(resolveFieldOrder('envelope', {}), ['campaign.subjectLine', 'campaign.previewText'])
})

test('a saved field order is kept, repaired for fields that are missing, unknown or repeated', () => {
  const order = resolveFieldOrder('envelope', { envelope: ['campaign.previewText', 'campaign.bogus', 'campaign.previewText'] })
  assert.deepEqual(order, ['campaign.previewText', 'campaign.subjectLine'])
})

test('a field can only be ordered within its own section', () => {
  const order = resolveFieldOrder('envelope', { envelope: ['campaign.fromName', 'campaign.previewText'] })
  assert.deepEqual(order, ['campaign.previewText', 'campaign.subjectLine'])
})

test('a field moves up or down one place within its section', () => {
  const start = resolveFieldOrder('identity', undefined)
  assert.deepEqual(moveSection(start, 'campaign.utmCampaign', -1).slice(-2), ['campaign.utmCampaign', 'campaign.emailDescription'])
  assert.deepEqual(moveSection(start, 'campaign.emailType', -1), start)
})

test('every field gets a position within its section, for the page to order by', () => {
  const positions = fieldPositions({ envelope: ['campaign.previewText', 'campaign.subjectLine'] })
  assert.equal(positions['campaign.previewText'], 1)
  assert.equal(positions['campaign.subjectLine'], 2)
  assert.equal(positions['campaign.emailType'], 1)
  assert.equal(positions['campaign.utmCampaign'], 5)
})

test('switched-off fields are the saved ones that exist, and nothing else', () => {
  const hidden = resolveHidden(['campaign.utmCampaign', 'campaign.bogus', 'deadlines.notes'])
  assert.deepEqual([...hidden].sort(), ['campaign.utmCampaign', 'deadlines.notes'])
  assert.equal(resolveHidden(undefined).size, 0)
})
