import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { seedBuild, headerModuleFor, bindBrief, buildFromLegacy } from './seed.ts'
import { setRegion } from './build.ts'
import { renderBuild } from './render.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

const cat: ThemeCatalogue = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-coral.json'), 'utf8'),
)
const BRIEF = { headline: 'My headline', subHeadline: 'My sub', bodyIntro: '<p>My intro</p>' }

test('a seeded build has header, body, footer and disclaimer in the fixed slots', () => {
  const b = seedBuild('agulhas-coral', { headerTypeId: 'standard-bg-image', regions: ['ZA'] })
  assert.deepEqual(b.modules.map((m) => [m.moduleName, m.slot]), [
    ['Header with Image', 'header'], ['Body Content', 'body'], ['Footer v1', 'footer'], ['Disclaimer', 'disclaimer'],
  ])
})

test('the UK disclaimer is seeded for UK briefs', () => {
  const b = seedBuild('agulhas-coral', { regions: ['UK'] })
  assert.equal(b.modules[3].moduleName, 'Disclaimer - UK')
})

test('header types map to library modules, and slim-35yr is pending', () => {
  assert.equal(headerModuleFor('standard'), 'Plain Logo Header')
  assert.equal(headerModuleFor('slim'), 'Small Header v2')
  assert.equal(headerModuleFor('standard-35yr'), 'Small Header')
  assert.equal(headerModuleFor('standard-bg-image'), 'Header with Image')
  assert.equal(headerModuleFor('slim-35yr'), null)
})

test('binding sets the h1, h2 and body regions and records the bindings', () => {
  const b = bindBrief(seedBuild('agulhas-coral', { headerTypeId: 'standard-bg-image' }), BRIEF, cat, parse)
  const h = b.modules[0]
  assert.deepEqual(Object.values(h.boundFields).sort(), ['headline', 'subHeadline'])
  assert.equal(b.modules[1].boundFields['root.0'], 'bodyIntro')
  const html = renderBuild(b, cat, { parse }).html
  assert.ok(html.includes('My headline') && html.includes('My sub') && html.includes('My intro'))
})

test('binding does not overwrite a region the user edited directly', () => {
  let b = bindBrief(seedBuild('agulhas-coral'), BRIEF, cat, parse)
  b = setRegion(b, b.modules[1].instanceId, 'root.0', { value: 'typed in builder' })
  b = bindBrief(b, { ...BRIEF, bodyIntro: 'changed in brief' }, cat, parse)
  assert.equal(b.modules[1].regions['root.0'].value, 'typed in builder')
})

test('a bound region follows later changes to the brief field', () => {
  let b = bindBrief(seedBuild('agulhas-coral'), BRIEF, cat, parse)
  b = bindBrief(b, { ...BRIEF, bodyIntro: 'changed in brief' }, cat, parse)
  assert.equal(b.modules[1].regions['root.0'].value, 'changed in brief')
})

test('Small Header v2 has no h2, so the sub-headline stays unbound without error', () => {
  const b = bindBrief(seedBuild('agulhas-coral', { headerTypeId: 'slim' }), BRIEF, cat, parse)
  assert.deepEqual(Object.values(b.modules[0].boundFields), ['headline'])
})

test('empty brief fields leave the library text in place', () => {
  const b = bindBrief(seedBuild('agulhas-coral'), { headline: '', subHeadline: '', bodyIntro: '' }, cat, parse)
  assert.deepEqual(b.modules[1].boundFields, {})
})

test('legacy module ids map onto library modules and unknown ones are reported', () => {
  const { build, unmapped } = buildFromLegacy(
    { modules: ['greeting', 'cta-single-primary', 'article-list-v1', 'no-such-id'], sections: [] },
    'agulhas-coral', {})
  const names = build.modules.map((m) => m.moduleName)
  assert.deepEqual(names.slice(2, 5), ['Greeting', 'Single Primary CTA', 'Article List'])
  assert.deepEqual(unmapped, ['no-such-id'])
})

test('a legacy header or footer id swaps the seeded slot module', () => {
  const { build } = buildFromLegacy({ modules: ['header-small', 'footer-v2'], sections: [] }, 'agulhas-coral', {})
  assert.equal(build.modules[0].moduleName, 'Small Header')
  assert.equal(build.modules.find((m) => m.slot === 'footer')!.moduleName, 'Footer V2')
})

test('legacy sections become Body Content modules instead of being lost', () => {
  const { build } = buildFromLegacy(
    { modules: [], sections: [{ heading: 'Rates', body: '<p>Outlook</p>' }, { heading: '', body: '' }] },
    'agulhas-coral', {})
  const extra = build.modules.filter((m) => m.moduleName === 'Body Content' && !m.slot)
  assert.equal(extra.length, 1)
  assert.ok(extra[0].regions['root.0'].value?.includes('Rates'))
})
