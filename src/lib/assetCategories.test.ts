import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ASSET_CATEGORY_ORDER, nextAssetCategory } from './assetCategories.ts'
import type { AssetCategory } from '../types/settings.types.ts'

const all = new Set<AssetCategory>(ASSET_CATEGORY_ORDER)

test('the categories are in the order Settings → Asset Library lists them', () => {
  assert.deepEqual([...ASSET_CATEGORY_ORDER], ['header', 'profile', 'stripes', 'logos', 'graphics', 'images', 'gifs'])
})

test('each click moves on to the next category, and the last goes back to the first', () => {
  assert.equal(nextAssetCategory('images', all), 'gifs')
  assert.equal(nextAssetCategory('gifs', all), 'header')
  assert.equal(nextAssetCategory('header', all), 'profile')
})

test('a category with nothing in it is skipped', () => {
  const some = new Set<AssetCategory>(['images', 'profile'])
  assert.equal(nextAssetCategory('images', some), 'profile')
  assert.equal(nextAssetCategory('profile', some), 'images')
  assert.equal(nextAssetCategory('graphics', some), 'images')
})

test('when no other category has anything there is nowhere to go', () => {
  assert.equal(nextAssetCategory('images', new Set<AssetCategory>(['images'])), null)
  assert.equal(nextAssetCategory('images', new Set<AssetCategory>()), null)
})
