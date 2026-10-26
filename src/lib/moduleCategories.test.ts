import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoryLabel, DEFAULT_MODULE_CATEGORIES, moduleCategories, newCategoryId, normaliseCategoryId, resolveCategory } from './moduleCategories.ts'

test('the default list is the one both Settings and the picker use, ending with Other', () => {
  const ids = DEFAULT_MODULE_CATEGORIES.map((c) => c.id)
  assert.deepEqual(ids, ['Headers', 'Content', 'Calls to action', 'Events', 'People', 'Articles', 'Media', 'Navigation', 'Legal', 'Footers', 'Other'])
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(moduleCategories({}), DEFAULT_MODULE_CATEGORIES)
})

test('categories saved in Settings are used, and Other is always there to fall back to', () => {
  const list = moduleCategories({ moduleCategories: [{ id: 'Content', label: 'Copy' }, { id: 'Promo', label: 'Promotions' }] })
  assert.deepEqual(list.map((c) => c.id), ['Content', 'Promo', 'Other'])
  assert.equal(categoryLabel(list, 'Content'), 'Copy')
})

test('old category names become the new ones, and an unknown or deleted one falls back to Other', () => {
  assert.equal(normaliseCategoryId('CTAs'), 'Calls to action')
  assert.equal(normaliseCategoryId('Speakers'), 'People')
  assert.equal(normaliseCategoryId('Events'), 'Events')
  const list = moduleCategories({})
  assert.equal(resolveCategory(list, 'CTAs'), 'Calls to action')
  assert.equal(resolveCategory(list, 'Speakers'), 'People')
  assert.equal(resolveCategory(list, 'Deleted one'), 'Other')
  assert.equal(resolveCategory(list, undefined), 'Other')
})

test('a new category gets an id from its label, made unique', () => {
  const list = moduleCategories({})
  assert.equal(newCategoryId(list, ' Promotions '), 'Promotions')
  assert.equal(newCategoryId(list, 'content'), 'content 2')
  assert.equal(newCategoryId([...list, { id: 'content 2', label: 'x' }], 'Content'), 'Content 3')
})
