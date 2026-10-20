import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { themeFolderName, loadCatalogue, clearCatalogueCache, loadAvailableThemes } from './catalogue.ts'

const SAMPLE = { themeId: 'agulhas-coral', shell: { head: '<h>', tail: '</h>' }, order: ['Greeting'], modules: { Greeting: '<tr></tr>' } }

let calls = 0
function stub(status: number) {
  return (async () => { calls++; return new Response(JSON.stringify(SAMPLE), { status }) }) as unknown as typeof fetch
}

beforeEach(() => { calls = 0; clearCatalogueCache() })

test('a theme label maps to its library folder name', () => {
  assert.equal(themeFolderName('Agulhas Indigo / Cape Coral'), 'Agulhas Indigo Cape Coral')
})

test('the catalogue is fetched once per theme and then served from cache', async () => {
  const f = stub(200)
  const a = await loadCatalogue('agulhas-coral', f)
  const b = await loadCatalogue('agulhas-coral', f)
  assert.equal(a.modules.Greeting, '<tr></tr>')
  assert.equal(a, b)
  assert.equal(calls, 1)
})

test('a failed fetch rejects naming the theme and is not cached', async () => {
  await assert.rejects(loadCatalogue('agulhas-coral', stub(404)), /agulhas-coral/)
  await loadCatalogue('agulhas-coral', stub(200))
  assert.equal(calls, 2)
})

test('a theme with no module library gives a readable error, not a JSON parse error', async () => {
  const html = (async () => new Response('<!doctype html><html></html>', { status: 200 })) as unknown as typeof fetch
  await assert.rejects(loadCatalogue('white-teal', html), /no module library.*white-teal/i)
})

test('the list of themes that have a module library is read from the index', async () => {
  const f = (async () => new Response(JSON.stringify({ themes: ['agulhas-coral'] }), { status: 200 })) as unknown as typeof fetch
  assert.deepEqual(await loadAvailableThemes(f), ['agulhas-coral'])
})

test('if the index is unavailable every theme is treated as available', async () => {
  const f = (async () => new Response('<!doctype html>', { status: 200 })) as unknown as typeof fetch
  assert.equal(await loadAvailableThemes(f), null)
})
