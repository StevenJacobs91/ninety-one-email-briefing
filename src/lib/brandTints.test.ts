import { test } from 'node:test'
import assert from 'node:assert/strict'
import { brandTints, legacyDerivedTints, normaliseTints, BRAND_TINTS } from './brandTints.ts'
import { DEFAULT_BRAND_THEMES } from './settingsDefaults.ts'

// The brand guideline's exact tint values for each primary colour.
const SPEC: Record<string, [string, string, string]> = {
  '#134848': ['#1d4f4f', '#114141', '#0d3232'], // Leatherback Green
  '#0a3323': ['#16543a', '#10422d', '#072419'], // Marula Green
  '#591739': ['#652043', '#511536', '#3c0e2e'], // Pinotage Burgundy
  '#e8e5ce': ['#eeebda', '#dbd8c0', '#b3aa9c'], // Springbok Cream
  '#221b3b': ['#292047', '#1e1834', '#181329'], // Agulhas Indigo
  '#74908d': ['#809a96', '#698282', '#54666d'], // Galjoen Gray
}

test('every brand primary has the guideline\'s exact three tints', () => {
  for (const [primary, [t1, t2, t3]] of Object.entries(SPEC)) {
    assert.deepEqual(brandTints(primary), { tint01: t1, tint02: t2, tint03: t3 }, primary)
  }
  assert.equal(Object.keys(BRAND_TINTS).length, Object.keys(SPEC).length)
})

test('a colour outside the brand falls back to the calculated tints', () => {
  assert.deepEqual(brandTints('#123456'), legacyDerivedTints('#123456'))
})

test('the old calculated tints are what the formula gives (so saved ones can be recognised)', () => {
  assert.deepEqual(legacyDerivedTints('#134848'), { tint01: '#2d6262', tint02: '#063b3b', tint03: '#001515' })
})

test('every built-in coloured theme ships with the brand tints', () => {
  const themed = DEFAULT_BRAND_THEMES.filter((t) => SPEC[t.primary.toLowerCase()])
  assert.equal(themed.length, 15)
  for (const t of themed) {
    const [t1, t2, t3] = SPEC[t.primary.toLowerCase()]
    assert.deepEqual([t.tint01, t.tint02, t.tint03], [t1, t2, t3], t.id)
  }
})

test('a saved theme still carrying the old calculated tints is upgraded to the brand tints', () => {
  const saved = { id: 'leatherback-coral', primary: '#134848', accent: '#fbaa96', ...legacyDerivedTints('#134848') }
  const out = normaliseTints(saved)
  assert.deepEqual([out.tint01, out.tint02, out.tint03], SPEC['#134848'])
})

test('tints a team chose themselves are kept', () => {
  const saved = { id: 'leatherback-coral', primary: '#134848', accent: '#fbaa96', tint01: '#222222', tint02: '#063b3b', tint03: '#001515' }
  assert.deepEqual(normaliseTints(saved), saved)
})

test('a custom theme is left alone', () => {
  const saved = { id: 'custom-1', primary: '#123456', accent: '#ffffff', ...legacyDerivedTints('#123456') }
  assert.deepEqual(normaliseTints(saved), saved)
})
