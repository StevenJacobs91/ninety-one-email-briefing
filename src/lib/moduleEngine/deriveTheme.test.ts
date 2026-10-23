import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { baseThemeFor, deriveCatalogue, derivableThemes, loadCatalogueFor } from './deriveTheme.ts'
import type { ThemeCatalogue } from './catalogue.ts'

const real = (id: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'module-catalogue', `${id}.json`), 'utf8')) as ThemeCatalogue
const INDEX = ['leatherback-coral', 'springbok-red', 'white-red', 'white-teal', 'white-pinotage']
const theme = (id: string, primary: string, accent: string, over: Record<string, unknown> = {}) => ({ id, label: id, primary, accent, ...over }) as never
const THEMES = [
  theme('leatherback-coral', '#134848', '#fbaa96'),
  theme('white-red', '#ffffff', '#d83949', { tint01: '#ffffff', tint02: '#f4f4f4', tint03: '#e4e5e6' }),
  theme('white-teal', '#ffffff', '#009d80'),
  theme('white-pinotage', '#ffffff', '#591739'),
  theme('white-coral', '#ffffff', '#fbaa96', { tint01: '#ffffff', tint02: '#f4f4f4', tint03: '#e4e5e6' }),
  theme('white-leatherback-green', '#ffffff', '#134848'),
  theme('indigo-lime', '#221b3b', '#a3e635'),
]

test('a theme with no library borrows the one of a theme with the same primary colour', () => {
  assert.equal(baseThemeFor('white-coral', THEMES, INDEX), 'white-red')
  assert.equal(baseThemeFor('white-leatherback-green', THEMES, INDEX), 'white-red')
  assert.equal(baseThemeFor('white-red', THEMES, INDEX), null, 'a theme that has its own library borrows nothing')
  assert.equal(baseThemeFor('indigo-lime', THEMES, INDEX), null, 'no library has this primary colour')
  assert.equal(baseThemeFor('unknown', THEMES, INDEX), null)
})

test('the themes that can be offered with an approximate library', () => {
  assert.deepEqual(derivableThemes(THEMES, INDEX), ['white-coral', 'white-leatherback-green'])
})

test('the derived library has the borrowed library\'s modules in the new theme\'s accent colour', () => {
  const base = real('white-pinotage')
  const derived = deriveCatalogue(base, THEMES[3], THEMES[4], 'white-coral')
  assert.equal(derived.themeId, 'white-coral')
  assert.deepEqual(derived.order, base.order)
  assert.deepEqual(Object.keys(derived.modules), Object.keys(base.modules))
  const all = derived.shell.head + derived.shell.tail + Object.values(derived.modules).join(' ')
  assert.ok(!/#591739/i.test(all), 'no trace of the borrowed accent')
  assert.ok(/#fbaa96/i.test(derived.shell.head), 'the colour block carries the new accent')
  assert.ok((all.match(/#fbaa96/gi) ?? []).length > 100)
})

test('neutral colours and the borrowed library itself are left alone', () => {
  const base = real('white-pinotage')
  const before = JSON.stringify(base)
  const derived = deriveCatalogue(base, THEMES[3], THEMES[4], 'white-coral')
  assert.equal(JSON.stringify(base), before)
  for (const neutral of ['#424242', '#ffffff', '#f4f4f4']) {
    const count = (s: string) => (s.match(new RegExp(neutral, 'gi')) ?? []).length
    assert.equal(count(JSON.stringify(derived)), count(JSON.stringify(base)), neutral)
  }
})

test('a theme with its own tints has them carried across', () => {
  const base = real('white-pinotage')
  const from = theme('white-pinotage', '#ffffff', '#591739', { tint02: '#f4f4f4' })
  const to = theme('white-mint', '#ffffff', '#00aa88', { tint02: '#eefaf6' })
  const derived = deriveCatalogue(base, from, to, 'white-mint')
  assert.ok(/#eefaf6/i.test(derived.shell.head))
})

test('the library is loaded as is for a theme that has one, and derived for one that has not', async () => {
  const files = (url: string) => {
    const m = url.match(/module-catalogue\/(.+)\.json$/)
    if (!m) return Promise.resolve(new Response('', { status: 404 }))
    try { return Promise.resolve(new Response(readFileSync(join(process.cwd(), 'public', 'module-catalogue', `${m[1]}.json`), 'utf8'))) } catch { return Promise.resolve(new Response('<html>', { status: 200 })) }
  }
  const own = await loadCatalogueFor('white-teal', THEMES, INDEX, files as never)
  assert.equal(own.themeId, 'white-teal')
  assert.ok(/#009d80/i.test(own.shell.head))
  const approx = await loadCatalogueFor('white-coral', THEMES, INDEX, files as never)
  assert.equal(approx.themeId, 'white-coral')
  assert.ok(/#fbaa96/i.test(approx.shell.head))
  await assert.rejects(loadCatalogueFor('indigo-lime', THEMES, INDEX, files as never), /no module library/i)
})
