import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyThemeTokens, categoryGroup, disabledModuleNames, HERO_PLACEHOLDER, mergeCustomModules, usesHeroImage, validateModuleHtml } from './customModules.ts'

const THEME = { primary: '#134848', accent: '#fbaa96', tint01: '#1d4f4f', tint02: '#114141', tint03: '#0d3232' }
const mod = (over: Record<string, unknown> = {}) => ({ id: 'promo', label: 'Promo Banner', description: '', category: 'Content', enabled: true, html: '<tr><td bgcolor="{{primary}}">Hello</td></tr>', ...over }) as never
const cat = { themeId: 'agulhas-gold', shell: { head: '', tail: '' }, order: ['Body Content'], modules: { 'Body Content': '<tr><td>Body</td></tr>' } }

test('theme tokens become that theme\'s colours, so one module works in every theme', () => {
  assert.equal(applyThemeTokens('<td bgcolor="{{primary}}" style="color:{{accent}}">{{tint01}}{{tint02}}{{tint03}}</td>', THEME), '<td bgcolor="#134848" style="color:#fbaa96">#1d4f4f#114141#0d3232</td>')
})

test('merge tags for Pardot and recipients are left alone', () => {
  const html = '<td>Dear {{Recipient.FirstName}} {{Unsubscribe}} {{View_Online}}</td>'
  assert.equal(applyThemeTokens(html, THEME), html)
})

test('a theme with no tint colours leaves the token for the author to see rather than breaking the HTML', () => {
  assert.equal(applyThemeTokens('{{tint01}}', { primary: '#000000', accent: '#ffffff' }), '{{tint01}}')
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
  assert.equal(categoryGroup('Footers'), 'Other')
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
