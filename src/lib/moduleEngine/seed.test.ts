import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { seedBuild, headerModuleFor, bindBrief, buildFromLegacy } from './seed.ts'
import { setRegion, setImage } from './build.ts'
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

// ─── Header types with their own code ────────────────────────────────────────

import { readdirSync } from 'node:fs'
import { withCustomHeaders, withCustomLibrary } from './seed.ts'
import { DEFAULT_BRAND_THEMES, DEFAULT_HEADER_TYPES } from '../settingsDefaults.ts'

const HEADER_ROW = '<tr><td bgcolor="{{primary}}"><img src="{{logo}}" alt=""><img src="{{stripe}}" alt=""><img src="{{slimStripe}}" alt=""><h1>Headline</h1></td></tr>'
const header = (over: Record<string, unknown> = {}) => ({ id: 'standard', label: 'Standard', htmlSnippet: HEADER_ROW, assets: {}, ...over }) as never
const library = (themeId: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'module-catalogue', `${themeId}.json`), 'utf8')) as ThemeCatalogue

test('a header type with its own code uses it, a built-in one replacing the library\'s module', () => {
  assert.equal(headerModuleFor('standard', [header()]), 'Plain Logo Header')
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [header()], brandThemes: DEFAULT_BRAND_THEMES })
  assert.notEqual(lib.modules['Plain Logo Header'], library('agulhas-gold').modules['Plain Logo Header'])
  assert.ok(lib.modules['Plain Logo Header'].includes('<h1>Headline</h1>'))
})

test('a header type added in Settings becomes a module of its own', () => {
  const custom = header({ id: 'campaign-x', label: 'Campaign X' })
  assert.equal(headerModuleFor('campaign-x', [custom]), 'Header: Campaign X')
  assert.equal(headerModuleFor('campaign-x'), 'Header with Image')
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [custom], brandThemes: DEFAULT_BRAND_THEMES })
  assert.ok(lib.order.includes('Header: Campaign X'))
  assert.equal(seedBuild('agulhas-gold', { headerTypeId: 'campaign-x', headers: [custom] }).modules[0].moduleName, 'Header: Campaign X')
})

test('the pending slim 35-year header is available once it has code', () => {
  assert.equal(headerModuleFor('slim-35yr'), null)
  assert.equal(headerModuleFor('slim-35yr', [header({ id: 'slim-35yr', label: 'Slim 35 year' })]), 'Header: Slim 35 year')
})

test('code that is not a table row, or has nothing in it, is not used', () => {
  assert.equal(headerModuleFor('campaign-x', [header({ id: 'campaign-x', label: 'X', htmlSnippet: '<div>no</div>' })]), 'Header with Image')
  const same = withCustomHeaders(library('agulhas-gold'), { headers: [header({ htmlSnippet: '   ' })], brandThemes: DEFAULT_BRAND_THEMES })
  assert.deepEqual(same, library('agulhas-gold'))
})

test('the anniversary badge comes from the header type, and its own images fill in where a theme has none', () => {
  const h = header({ htmlSnippet: '<tr><td><img src="{{anniversary}}"></td></tr>', assets: { thirtyFiveYearGraphicUrl: 'https://x/35.png' } })
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [h], brandThemes: [] })
  assert.ok(lib.modules['Plain Logo Header'].includes('https://x/35.png'))
})

test('one header works in every theme: its logo and stripes become that theme\'s own', () => {
  const files = readdirSync(join(process.cwd(), 'public', 'module-catalogue')).filter((f) => f.endsWith('.json') && f !== 'index.json')
  const gaps: string[] = []
  for (const f of files) {
    const themeId = f.replace('.json', '')
    const theme = DEFAULT_BRAND_THEMES.find((t) => t.id === themeId)!
    const lib = withCustomLibrary(library(themeId), { htmlModules: [], headers: [header()], brandThemes: DEFAULT_BRAND_THEMES })
    const html = lib.modules['Plain Logo Header']
    assert.ok(html.includes(`bgcolor="${theme.primary}"`), `${themeId} primary`)
    assert.ok(!html.includes('{{slimStripe}}'), `${themeId} slim stripe`)
    for (const token of ['logo', 'stripe']) if (html.includes(`{{${token}}}`)) gaps.push(`${themeId}:${token}`)
  }
  // The white themes have no image set in Settings or in their library for these; the token stays visible rather than breaking the image.
  assert.deepEqual(gaps, ['white-red:logo', 'white-red:stripe', 'white-teal:stripe'])
})

test('a theme\'s own slim stripe wins over the library\'s', () => {
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [header({ htmlSnippet: '<tr><td><img src="{{slimStripe}}"></td></tr>' })], brandThemes: [{ ...DEFAULT_BRAND_THEMES[0], id: 'agulhas-gold', slimStripeUrl: 'https://x/mine-slim.png' }] })
  assert.ok(lib.modules['Plain Logo Header'].includes('https://x/mine-slim.png'))
})
void DEFAULT_HEADER_TYPES

// ─── A header's replaceable background image ─────────────────────────────────

import { headerRequiresHero } from './seed.ts'
import { HERO_PLACEHOLDER } from '../customModules.ts'
import { newModule } from './build.ts'

const HERO_ROW = '<tr><td background="{{heroImage}}" bgcolor="{{primary}}" style="background-image:url({{heroImage}});"><!--[if gte mso 9]><v:image src="{{heroImage}}"></v:image><![endif]--><h1>Headline</h1></td></tr>'

test('code with a place for the background image asks the builder for one, without the header type\'s box being ticked', () => {
  assert.equal(headerRequiresHero(header({ requiresHeroImage: false, htmlSnippet: HERO_ROW })), true)
  assert.equal(headerRequiresHero(header({ requiresHeroImage: false, htmlSnippet: HEADER_ROW })), false)
  assert.equal(headerRequiresHero(header({ requiresHeroImage: true, htmlSnippet: '' })), true)
  assert.equal(headerRequiresHero(header({ requiresHeroImage: false, htmlSnippet: '<div>{{heroImage}}</div>' })), false)
  assert.equal(headerRequiresHero(undefined), false)
})

test('the background image variable becomes a replaceable placeholder, in every place the code uses it', () => {
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [header({ htmlSnippet: HERO_ROW })], brandThemes: DEFAULT_BRAND_THEMES })
  const html = lib.modules['Plain Logo Header']
  assert.equal(html.split(HERO_PLACEHOLDER).length - 1, 3)
  assert.ok(!html.includes('{{heroImage}}'))
})

test('the email\'s chosen image replaces the placeholder everywhere, including the Outlook version', () => {
  const lib = withCustomHeaders(library('agulhas-gold'), { headers: [header({ htmlSnippet: HERO_ROW })], brandThemes: DEFAULT_BRAND_THEMES })
  let b = { version: 1 as const, themeId: 'agulhas-gold', modules: [newModule('Plain Logo Header', 'header')] }
  b = setImage(b, b.modules[0].instanceId, 'img:0', { src: 'https://cdn/hero.jpg' })
  const out = renderBuild(b, { ...lib, shell: { head: '', tail: '' } }, { parse }).html
  assert.equal(out.split('https://cdn/hero.jpg').length - 1, 3)
  assert.ok(!out.includes('placehold.co'))
})

test('a slim stripe set on the header type is used where the theme has none, ahead of the library\'s own guess', () => {
  const h = header({ htmlSnippet: '<tr><td><img src="{{slimStripe}}"></td></tr>', assets: { slimStripeUrl: 'https://x/header-slim.png' } })
  const none = DEFAULT_BRAND_THEMES.map((t) => ({ ...t, slimStripeUrl: undefined }))
  assert.ok(withCustomHeaders(library('agulhas-red'), { headers: [h], brandThemes: none }).modules['Plain Logo Header'].includes('https://x/header-slim.png'))
  const set = none.map((t) => (t.id === 'agulhas-red' ? { ...t, slimStripeUrl: 'https://x/theme-slim.png' } : t))
  assert.ok(withCustomHeaders(library('agulhas-red'), { headers: [h], brandThemes: set }).modules['Plain Logo Header'].includes('https://x/theme-slim.png'))
})
