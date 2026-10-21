import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitFontSize } from './fitText.ts'

// A line of text is `width` pixels wide when set at `px`: here, 10 characters at half the font size each.
const widthAt = (chars: number) => (px: number) => chars * px * 0.5

test('uses the largest size when the text already fits', () => {
  assert.equal(fitFontSize(32, 14, (px) => widthAt(10)(px) <= 400), 32)
})

test('shrinks to the largest size that fits', () => {
  // 10 chars * px * 0.5 <= 120  =>  px <= 24
  assert.equal(fitFontSize(32, 14, (px) => widthAt(10)(px) <= 120), 24)
  assert.equal(fitFontSize(32, 14, (px) => widthAt(10)(px) <= 125), 25)
})

test('never goes below the smallest size, even if the text still does not fit', () => {
  assert.equal(fitFontSize(32, 14, () => false), 14)
})

test('a minimum above the maximum just uses the minimum', () => {
  assert.equal(fitFontSize(10, 14, () => true), 14)
})

test('only asks about whole pixel sizes within the range', () => {
  const asked: number[] = []
  fitFontSize(32, 14, (px) => { asked.push(px); return px <= 20 })
  assert.ok(asked.every((px) => Number.isInteger(px) && px >= 14 && px <= 32))
  assert.ok(asked.length <= 8, 'a binary search, not a scan')
})
