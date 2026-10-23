import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listImageSlots, listPlaceholders, renderBuild } from './render.ts'
import { describeModule } from './describe.ts'
import { newModule, setImage } from './build.ts'
import { parse } from './fixtures.ts'

const PROFILE = 'https://weare.ninetyone.com/l/28902/2021/profile_marc_lindley_v3_261x377.png'
const PLACEHOLDER = 'https://placehold.co/300x225/292047/e8e5ce.png'
const html = `<table><tr><td><img alt="Thumbnail of Marc Lindley " src="${PROFILE}" width="152"><img src="https://weare.ninetyone.com/icon_go_20x20.png"><img alt="x" src="${PLACEHOLDER}"></td></tr></table>`

test('profile photos are replaceable media, after the placeholders so saved keys keep their meaning', () => {
  assert.deepEqual(listImageSlots(html), [
    { url: PLACEHOLDER, kind: 'placeholder' },
    { url: PROFILE, kind: 'profile' },
  ])
  assert.deepEqual(listPlaceholders(html), [PLACEHOLDER])
})

test('icons and logos are not offered as media', () => {
  assert.equal(listImageSlots('<img src="https://x/icon_go_20x20.png">').length, 0)
})

test('describing a module lists its photos with what kind each is', () => {
  const info = describeModule('PM 1', html, parse)
  assert.deepEqual(info.images, [PLACEHOLDER, PROFILE])
  assert.deepEqual(info.imageKinds, ['placeholder', 'profile'])
})

test('a chosen photo replaces the profile image and its alt text', () => {
  const cat = { themeId: 't', shell: { head: '', tail: '' }, order: ['PM 1'], modules: { 'PM 1': html } }
  let b = { version: 1 as const, themeId: 't', modules: [newModule('PM 1')] }
  b = setImage(b, b.modules[0].instanceId, 'img:1', { src: 'https://cdn/new.png', alt: 'Jane Smith' })
  const { html: out } = renderBuild(b, cat, { parse })
  assert.ok(out.includes('src="https://cdn/new.png"'))
  assert.ok(out.includes('alt="Jane Smith"'))
  assert.ok(!out.includes(PROFILE))
  assert.ok(out.includes(PLACEHOLDER))
})

test('without an alt text the original alt stays', () => {
  const cat = { themeId: 't', shell: { head: '', tail: '' }, order: ['PM 1'], modules: { 'PM 1': html } }
  let b = { version: 1 as const, themeId: 't', modules: [newModule('PM 1')] }
  b = setImage(b, b.modules[0].instanceId, 'img:1', { src: 'https://cdn/new.png' })
  assert.ok(renderBuild(b, cat, { parse }).html.includes('alt="Thumbnail of Marc Lindley "'))
})

test('changing only the alt text keeps the chosen photo', () => {
  let b = { version: 1 as const, themeId: 't', modules: [newModule('PM 1')] }
  const id = b.modules[0].instanceId
  b = setImage(b, id, 'img:1', { src: 'https://cdn/new.png' })
  b = setImage(b, id, 'img:1', { src: undefined, alt: 'Jane Smith' })
  assert.deepEqual(b.modules[0].images['img:1'], { src: 'https://cdn/new.png', alt: 'Jane Smith' })
})

test('other content images are replaceable too, after placeholders and photos', () => {
  const g = 'https://weare.ninetyone.com/l/1/perspective_view_iphone_x_800x873.png'
  const slots = listImageSlots(`<img src="${g}" width="400" height="436"><img src="${PROFILE}"><img src="${PLACEHOLDER}">`)
  assert.deepEqual(slots.map((s) => s.kind), ['placeholder', 'profile', 'graphic'])
  assert.equal(slots[2].url, g)
})

test('icons, spacers, logos, stripes and tracking pixels are not media', () => {
  const tags = [
    'https://x/icon_go_gazania_gold_v2_20x20.png', 'https://x/spacer.gif', 'https://x/91_logo_digital_white.png',
    'https://x/banner_stripe_warm_yellow_600x250.png', 'https://x/Footer_logo_Gazania_Gold.png',
  ].map((u) => `<img src="${u}">`).join('') + '<img src="https://x/dot.png" width="1" height="1"><img src="https://x/small.png" width="40" height="40">'
  assert.deepEqual(listImageSlots(tags), [])
})

test('an image the design already marked as an editable region is left to that region', () => {
  assert.deepEqual(listImageSlots(`<img pardot-region="editable-image" src="${PROFILE}">`), [])
  assert.equal(listImageSlots(`<img pardot-region-type="image" src="${PROFILE}">`).length, 1)
})

test('a replaced graphic takes its new alt text too', () => {
  const g = 'https://weare.ninetyone.com/l/1/perspective_view_iphone_x_800x873.png'
  const h = `<table><tr><td><img alt="Phone" src="${g}" width="400"></td></tr></table>`
  const cat = { themeId: 't', shell: { head: '', tail: '' }, order: ['Podcast Module'], modules: { 'Podcast Module': h } }
  let b = { version: 1 as const, themeId: 't', modules: [newModule('Podcast Module')] }
  b = setImage(b, b.modules[0].instanceId, 'img:0', { src: 'https://cdn/cover.png', alt: 'Cover art' })
  const out = renderBuild(b, cat, { parse }).html
  assert.ok(out.includes('src="https://cdn/cover.png"') && out.includes('alt="Cover art"'))
})
