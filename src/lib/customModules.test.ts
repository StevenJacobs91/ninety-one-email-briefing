import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyThemeTokens, categoryGroup, customLayoutIcons, disabledModuleNames, fragmentPreviewDoc, HERO_PLACEHOLDER, mergeCustomModules, modulePreviewDoc, themeColoursOf, themeTokensFor, tokeniseModule, usesHeroImage, validateModuleHtml } from './customModules.ts'

const THEME = { primary: '#134848', accent: '#fbaa96', tint01: '#1d4f4f', tint02: '#114141', tint03: '#0d3232' }
const mod = (over: Record<string, unknown> = {}) => ({ id: 'promo', label: 'Promo Banner', description: '', category: 'Content', enabled: true, html: '<tr><td bgcolor="{{primary}}">Hello</td></tr>', ...over }) as never
const cat = { themeId: 'agulhas-gold', shell: { head: '', tail: '' }, order: ['Body Content'], modules: { 'Body Content': '<tr><td>Body</td></tr>' } }

test('theme tokens become that theme\'s colours, so one module works in every theme', () => {
  assert.equal(applyThemeTokens('<td bgcolor="{{primary}}" style="color:{{accent}}">{{tint01}}{{tint02}}{{tint03}}</td>', THEME), '<td bgcolor="#134848" style="color:#fbaa96">#1d4f4f#114141#0d3232</td>')
})

test('{{text}} is the theme\'s text colour, so one module reads on a dark theme and a light one', () => {
  const html = '<td style="color:{{text}}">Body</td>'
  const dark = { ...cat, themeId: 'agulhas-gold' }
  const light = { ...cat, themeId: 'springbok-red' }
  const chosen = { brandThemes: [{ id: 'agulhas-gold', primary: '#221b3b', accent: '#cf6f13', defaultTextColour: '#424242' }] as never }
  assert.equal(applyThemeTokens(html, themeTokensFor(dark, chosen)), '<td style="color:#424242">Body</td>', 'Brand Themes\' choice wins')
  assert.equal(themeTokensFor(dark, { brandThemes: [] }).text, '#e8e5ce', 'a dark primary with no choice gets cream')
  assert.equal(themeTokensFor(light, { brandThemes: [] }).text, '#424242', 'a light primary with no choice gets charcoal')
  assert.equal(tokeniseModule('<td style="color:#e8e5ce">', { primary: '#221b3b', accent: '#cf6f13', text: '#e8e5ce' }), '<td style="color:#e8e5ce">', 'existing code is never rewritten to use it')
})

test('a preview document shows module code as an email would, in a theme\'s colours', () => {
  const colours = themeColoursOf({ id: 't', label: 'T', primary: '#221b3b', accent: '#cf6f13', tint01: '#292047', logoUrl: 'https://x/logo.png' })
  assert.equal(colours.text, '#e8e5ce')
  assert.equal(colours.logo, 'https://x/logo.png')
  const doc = modulePreviewDoc('<tr><td bgcolor="{{primary}}"><img src="{{logo}}">{{Unsubscribe}}</td></tr>', colours)
  assert.ok(doc.includes('<table width="640"') && doc.includes('bgcolor="#221b3b"') && doc.includes('src="https://x/logo.png"'))
  assert.ok(doc.includes('{{Unsubscribe}}'), 'merge tags are left as they are')
  assert.ok(modulePreviewDoc('  ', colours).includes('No code yet.'))
  assert.equal(themeColoursOf(undefined).primary, '#134848', 'no theme still gives colours to preview in')
  assert.ok(fragmentPreviewDoc('<p>Hi</p>').includes('<p>Hi</p>') && fragmentPreviewDoc('').includes('Nothing to preview yet.'))
})

test('merge tags for Pardot and recipients are left alone', () => {
  const html = '<td>Dear {{Recipient.FirstName}} {{Unsubscribe}} {{View_Online}}</td>'
  assert.equal(applyThemeTokens(html, THEME), html)
})

test('a theme with no tint colours leaves the token for the author to see rather than breaking the HTML', () => {
  assert.equal(applyThemeTokens('{{tint01}}', { primary: '#000000', accent: '#ffffff' }), '{{tint01}}')
})

test('the 35-year logo and every icon are variables, from Brand Themes first and the theme\'s own library otherwise', () => {
  const library = {
    themeId: 'agulhas-gold', order: [],
    shell: { head: '<img src="https://cdn.example/x/icon_clock_gold_40x40.png">', tail: '' },
    modules: {
      A: '<img src="https://cdn.example/x/icon_gold_calendar_40x40.png"><img src="https://cdn.example/x/icon_yellow_calendar_119x119.png"><img src="https://cdn.example/x/icon_warm_yellow_location_40x40.png">',
      B: '<img src="https://cdn.example/x/icon_document_gold_40x40.png"><img src="https://cdn.example/x/icon_go_gazania_gold_v2_20x20.png"><img src="https://cdn.example/x/image_35_years_graphic_warm_yellowwood_v1_300x300.png">',
      Footer: ['facebook', 'instagram', 'linkedin', 'youtube', 'spotify', 'apple_podcasts'].map((n) => `<img src="https://cdn.example/x/icon_social_${n}_sc_v1_80x80.png">`).join(''),
    },
  }
  const fromLibrary = themeTokensFor(library, { brandThemes: [] })
  assert.equal(fromLibrary.iconClock, 'https://cdn.example/x/icon_clock_gold_40x40.png')
  assert.equal(fromLibrary.iconCalendar, 'https://cdn.example/x/icon_gold_calendar_40x40.png')
  assert.equal(fromLibrary.iconCalendarLarge, 'https://cdn.example/x/icon_yellow_calendar_119x119.png')
  assert.equal(fromLibrary.iconLocation, 'https://cdn.example/x/icon_warm_yellow_location_40x40.png')
  assert.equal(fromLibrary.iconDocument, 'https://cdn.example/x/icon_document_gold_40x40.png')
  assert.equal(fromLibrary.iconArrow, 'https://cdn.example/x/icon_go_gazania_gold_v2_20x20.png')
  assert.equal(fromLibrary.iconApplePodcasts, 'https://cdn.example/x/icon_social_apple_podcasts_sc_v1_80x80.png')
  assert.equal(fromLibrary.iconLinkedin, 'https://cdn.example/x/icon_social_linkedin_sc_v1_80x80.png')
  assert.equal(fromLibrary.anniversary, 'https://cdn.example/x/image_35_years_graphic_warm_yellowwood_v1_300x300.png')

  const set = themeTokensFor(library, { brandThemes: [{ id: 'agulhas-gold', primary: '#221b3b', accent: '#cf6f13', anniversaryLogoUrl: 'https://mine/35.png', iconUrls: { clock: 'https://mine/clock.png' } }] as never })
  assert.equal(set.iconClock, 'https://mine/clock.png', 'Brand Themes wins')
  assert.equal(set.anniversary, 'https://mine/35.png')
  assert.equal(set.iconCalendar, 'https://cdn.example/x/icon_gold_calendar_40x40.png', 'an icon not set falls back to the library\'s')
})

test('a theme\'s own colours and images in library code become variables, and back again, so the code suits every theme', () => {
  const library = JSON.parse(readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-gold.json'), 'utf8')) as { themeId: string; shell: { head: string; tail: string }; order: string[]; modules: Record<string, string> }
  const own = { primary: '#221b3b', accent: '#cf6f13', tint01: '#292047', tint02: '#1e1834', tint03: '#181329' }
  const theme = { ...themeTokensFor(library, { brandThemes: [] }), ...own }
  for (const name of ['Dual Author Module', 'Event Registration v3', 'Footer v1', 'Small Header']) {
    const html = library.modules[name]
    const tokenised = tokeniseModule(html, theme)
    assert.ok(tokenised.includes('{{accent}}') || tokenised.includes('{{primary}}'), `${name} has theme colours`)
    assert.ok(!/#cf6f13|#221b3b|#292047/i.test(tokenised), `${name}: none of the theme's colours are left written out`)
    assert.equal(applyThemeTokens(tokenised, theme).toLowerCase(), html.toLowerCase(), `${name} comes back as it was`)
    // In another theme the same code takes that theme's colours.
    const other = applyThemeTokens(tokenised, { ...theme, primary: '#0a3323', accent: '#fbaa96', tint01: '#0d3d2a', tint02: '#08291d', tint03: '#051a12' })
    assert.ok(!/#cf6f13|#221b3b|#292047/i.test(other), `${name}: takes the other theme's colours`)
  }
  assert.ok(tokeniseModule(library.modules['Event Registration v3'], theme).includes('{{iconClock}}'), 'the icons become variables too')
})

test('only whole colours are replaced, longest first, and a repeated value takes the first variable', () => {
  assert.equal(tokeniseModule('<td bgcolor="#221b3b" style="color:#221b3bff;border:#cf6f13">', { primary: '#221b3b', accent: '#cf6f13' }), '<td bgcolor="{{primary}}" style="color:#221b3bff;border:{{accent}}">')
  assert.equal(tokeniseModule('#aabbcc #AABBCC', { primary: '#aabbcc', accent: '#aabbcc' }), '{{primary}} {{primary}}')
  assert.equal(tokeniseModule('<img src="https://x/y.png?a=1&amp;b=2">', { primary: '#000000', accent: '#ffffff', logo: 'https://x/y.png?a=1&amp;b=2' }), '<img src="{{logo}}">')
})

test('each icon variable in module code becomes its image', () => {
  const html = '<img src="{{iconClock}}"><img src="{{iconCalendarLarge}}"><img src="{{anniversary}}"><img src="{{iconSpotify}}">'
  const out = applyThemeTokens(html, { ...THEME, iconClock: 'https://i/clock.png', iconCalendarLarge: 'https://i/cal.png', anniversary: 'https://i/35.png' })
  assert.equal(out, '<img src="https://i/clock.png"><img src="https://i/cal.png"><img src="https://i/35.png"><img src="{{iconSpotify}}">')
})

test('layout icons chosen in Settings are listed by module name, ignoring any that is not a known icon', () => {
  const icons = customLayoutIcons([mod({ layoutIcon: 'columns2' }), mod({ id: 'b', label: 'Speakers', layoutIcon: 'nonsense' }), mod({ id: 'c', label: 'Plain' })])
  assert.deepEqual(icons, { 'Promo Banner': 'columns2' })
})

test('a module needs table-row code and nothing that could run', () => {
  assert.equal(validateModuleHtml(''), 'Paste the module\'s HTML.')
  assert.equal(validateModuleHtml('<p>Hi</p>'), 'Email modules are table rows: the code should start with <tr>.')
  assert.equal(validateModuleHtml('<tr><td><script>x()</script></td></tr>'), 'Scripts are not allowed in an email.')
  assert.equal(validateModuleHtml('<tr><td onclick="x()">Hi</td></tr>'), 'Event handlers such as onclick are not allowed in an email.')
  assert.equal(validateModuleHtml('<!-- Promo --><tr><td>Hi</td></tr>'), null)
  assert.equal(validateModuleHtml('<tr><td>Hi</td></tr>'), null)
})

test('custom modules join the library for a theme, with its colours, after the built-in ones', () => {
  const merged = mergeCustomModules(cat, [mod()], THEME)
  assert.deepEqual(merged.order, ['Body Content', 'Promo Banner'])
  assert.equal(merged.modules['Promo Banner'], '<tr><td bgcolor="#134848">Hello</td></tr>')
  assert.equal(merged.modules['Body Content'], '<tr><td>Body</td></tr>')
  assert.equal(cat.order.length, 1)
})

test('a module with no code, or switched off, does not join, and one named like a built-in replaces it', () => {
  assert.deepEqual(mergeCustomModules(cat, [mod({ html: undefined })], THEME).order, ['Body Content'])
  assert.deepEqual(mergeCustomModules(cat, [mod({ html: '   ' })], THEME).order, ['Body Content'])
  assert.deepEqual(mergeCustomModules(cat, [mod({ enabled: false })], THEME).order, ['Body Content'])
  const same = mergeCustomModules(cat, [mod({ label: 'Body Content', html: '<tr><td>Mine</td></tr>' })], THEME)
  assert.equal(same.modules['Body Content'], '<tr><td>Mine</td></tr>')
  assert.deepEqual(same.order, ['Body Content'])
})

test('a module switched off in Settings is left out of the picker, whether built in or custom', () => {
  const off = disabledModuleNames([mod({ label: 'Podcast Module', enabled: false, html: undefined }), mod({ label: 'Promo Banner', enabled: false }), mod({ label: 'Speakers' })])
  assert.deepEqual([...off].sort(), ['Podcast Module', 'Promo Banner'])
})

test('a custom module is grouped in the picker by its category', () => {
  assert.equal(categoryGroup('CTAs'), 'Calls to action')
  assert.equal(categoryGroup('Speakers'), 'People')
  assert.equal(categoryGroup('Content'), 'Content')
  assert.equal(categoryGroup('Footers'), 'Footers')
  assert.equal(categoryGroup('Promo'), 'Promo', 'a category added in Settings is its own group')
})

test('the theme\'s logo and stripes can be dropped into code as tokens', () => {
  const theme = { primary: '#134848', accent: '#fbaa96', logo: 'https://x/logo.png', stripe: 'https://x/stripe.png', slimStripe: 'https://x/slim.png', footerLogo: 'https://x/foot.png', anniversary: 'https://x/35.png' }
  const html = '<img src="{{logo}}"><img src="{{stripe}}"><img src="{{slimStripe}}"><img src="{{footerLogo}}"><img src="{{anniversary}}">'
  assert.equal(applyThemeTokens(html, theme), '<img src="https://x/logo.png"><img src="https://x/stripe.png"><img src="https://x/slim.png"><img src="https://x/foot.png"><img src="https://x/35.png">')
  assert.equal(applyThemeTokens('{{logo}}', { primary: '#000', accent: '#fff' }), '{{logo}}')
})

test('a header can mark where the email\'s own background image goes', () => {
  assert.equal(usesHeroImage('<td background="{{heroImage}}">'), true)
  assert.equal(usesHeroImage('<td background="https://x/a.jpg">'), false)
  assert.equal(usesHeroImage(undefined), false)
  assert.equal(applyThemeTokens('<td background="{{heroImage}}" style="background-image:url({{heroImage}})">', { primary: '#000', accent: '#fff', heroImage: HERO_PLACEHOLDER }),
    `<td background="${HERO_PLACEHOLDER}" style="background-image:url(${HERO_PLACEHOLDER})">`)
})
