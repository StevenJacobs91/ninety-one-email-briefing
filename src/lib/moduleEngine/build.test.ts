import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  newModule, addModule, removeModule, moveModule, duplicateModule, swapModule,
  setRegion, setRepeat, setImage, setTheme, setStyle, type EmailBuild,
} from './build.ts'
import { renderBuild } from './render.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

const cat: ThemeCatalogue = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-coral.json'), 'utf8'),
)

function base(): EmailBuild {
  return {
    version: 1, themeId: 'agulhas-coral',
    modules: [
      newModule('Header with Image', 'header'),
      newModule('Body Content', 'body'),
      newModule('Footer v1', 'footer'),
      newModule('Disclaimer', 'disclaimer'),
    ],
  }
}
const ids = (b: EmailBuild) => b.modules.map((m) => m.moduleName)

test('an empty build renders the shell head and tail only', () => {
  const out = renderBuild({ version: 1, themeId: 'agulhas-coral', modules: [] }, cat, { parse })
  assert.equal(out.html, cat.shell.head + cat.shell.tail)
})

test('an untouched module is emitted byte-for-byte from the library', () => {
  const out = renderBuild({ version: 1, themeId: 'agulhas-coral', modules: [newModule('Greeting')] }, cat, { parse })
  assert.ok(out.html.includes(cat.modules['Greeting']))
})

test('an edited region appears in the rendered email', () => {
  const start = base()
  const b = setRegion(start, start.modules[1].instanceId, 'root.0', { value: 'Hello <b>world</b>' })
  const m = b.modules[1]
  assert.equal(m.regions['root.0'].value, 'Hello <b>world</b>')
  const out = renderBuild(b, cat, { parse })
  assert.ok(out.html.includes('Hello <b>world</b>'))
})

test('header, footer and disclaimer slot modules cannot be removed or moved', () => {
  const b = base()
  for (const i of [0, 2, 3]) {
    assert.deepEqual(removeModule(b, b.modules[i].instanceId), b)
    assert.deepEqual(moveModule(b, b.modules[i].instanceId, 1), b)
  }
})

test('the seeded body module can be removed, moved and duplicated like any other', () => {
  let b = addModule(base(), 'Greeting', 1)
  const body = b.modules.find((m) => m.slot === 'body')!
  b = moveModule(b, body.instanceId, 1)
  assert.equal(b.modules[1].slot, 'body')
  assert.equal(duplicateModule(b, body.instanceId).modules.filter((m) => m.moduleName === 'Body Content').length, 2)
  b = removeModule(b, body.instanceId)
  assert.ok(!b.modules.some((m) => m.slot === 'body'))
})

test('added modules land between the header and the footer', () => {
  let b = base()
  b = addModule(b, 'Article List', 0)
  assert.deepEqual(ids(b), ['Header with Image', 'Article List', 'Body Content', 'Footer v1', 'Disclaimer'])
  b = addModule(b, 'Greeting', 99)
  assert.deepEqual(ids(b), ['Header with Image', 'Article List', 'Body Content', 'Greeting', 'Footer v1', 'Disclaimer'])
})

test('a free module can be moved, duplicated and removed', () => {
  let b = addModule(addModule(base(), 'Article List', 1), 'Greeting', 1)
  const g = b.modules.find((m) => m.moduleName === 'Greeting')!
  b = moveModule(b, g.instanceId, 2)
  assert.equal(b.modules[2].moduleName, 'Greeting')
  b = duplicateModule(b, g.instanceId)
  assert.equal(b.modules.filter((m) => m.moduleName === 'Greeting').length, 2)
  b = removeModule(b, g.instanceId)
  assert.equal(b.modules.filter((m) => m.moduleName === 'Greeting').length, 1)
})

test('a direct edit breaks a bound field', () => {
  let b = base()
  const id = b.modules[1].instanceId
  b = { ...b, modules: b.modules.map((m, i) => (i === 1 ? { ...m, boundFields: { 'root.0': 'bodyIntro' } } : m)) }
  b = setRegion(b, id, 'root.0', { value: 'typed' })
  assert.equal(b.modules[1].boundFields['root.0'], undefined)
})

test('a swapped seeded module keeps its slot', () => {
  const start = base()
  const b = swapModule(start, start.modules[0].instanceId, 'Small Header')
  assert.equal(b.modules[0].moduleName, 'Small Header')
  assert.equal(b.modules[0].slot, 'header')
})

test('repeat counts render as that many units', () => {
  let b = addModule(base(), 'Article List', 1)
  const id = b.modules[1].instanceId
  b = setRepeat(b, id, 'subheading', 5)
  const out = renderBuild(b, cat, { parse })
  const one = renderBuild(addModule(base(), 'Article List', 1), cat, { parse })
  assert.ok(out.html.length > one.html.length)
  assert.equal((out.html.match(/Thumbnail/g) ?? []).length, 5)
})

test('an image override replaces every occurrence of the placeholder', () => {
  let b = base()
  const id = b.modules[0].instanceId
  b = setImage(b, id, 'img:0', { src: 'https://cdn.example.com/hero.jpg' })
  const out = renderBuild(b, cat, { parse })
  assert.ok(out.html.includes('https://cdn.example.com/hero.jpg'))
  assert.ok(!out.html.includes('placehold.co/640x270'))
})

test('a theme switch reports saved keys the module no longer has, without throwing', () => {
  let b = base()
  const id = b.modules[1].instanceId
  b = setRegion(b, id, 'root.0', { value: 'kept' })
  b = setRegion(b, id, 'root.9', { value: 'orphan' })
  b = setTheme(b, 'agulhas-coral')
  const out = renderBuild(b, cat, { parse })
  assert.deepEqual(out.report.droppedKeys, [{ instanceId: id, key: 'root.9' }])
  assert.ok(out.html.includes('kept'))
})

test('an unknown module is reported and skipped', () => {
  const b = { ...base(), modules: [...base().modules, newModule('No Such Module')] }
  const out = renderBuild(b, cat, { parse })
  assert.deepEqual(out.report.unknownModules, ['No Such Module'])
})

test('settings assets override the library logo, stripe and footer logo', () => {
  const out = renderBuild(base(), cat, {
    parse,
    assets: { logoUrl: 'https://s.example/logo.png', stripeUrl: 'https://s.example/stripe.png', footerLogoUrl: 'https://s.example/footer.png' },
  })
  assert.ok(out.html.includes('https://s.example/logo.png'))
  assert.ok(out.html.includes('https://s.example/stripe.png'))
  assert.ok(out.html.includes('https://s.example/footer.png'))
})

test('setStyle records a spacing or class override against an element and merges later edits', () => {
  const start = base()
  const id = start.modules[1].instanceId
  let b = setStyle(start, id, 'container', { padding: { top: '10px' } })
  b = setStyle(b, id, 'container', { padding: { left: '5px' }, class: 'x' })
  assert.deepEqual(b.modules[1].styles?.container, { padding: { top: '10px', left: '5px' }, class: 'x' })
})

test('duplicating a module carries its overrides and swapping it starts fresh', () => {
  const start = base()
  const id = start.modules[1].instanceId
  const styled = setStyle(start, id, 'container', { padding: { top: '10px' } })
  const dup = duplicateModule(styled, id)
  assert.deepEqual(dup.modules[2].styles?.container, { padding: { top: '10px' } })
  const swapped = swapModule(styled, id, 'Greeting')
  assert.equal(swapped.modules[1].styles, undefined)
})

test('a padding override on the module container is rendered, and other modules are untouched', () => {
  const start = base()
  const b = setStyle(start, start.modules[1].instanceId, 'container', { padding: { top: '12px', bottom: '48' } })
  const out = renderBuild(b, cat, { parse })
  assert.match(out.html, /padding: 12px 40px 48px 40px/)
  const plain = renderBuild(start, cat, { parse })
  assert.ok(plain.html.includes('padding: 0px 40px 30px 40px'))
})

test('a margin and class override on a text region apply to every paragraph it was split into', () => {
  const start = base()
  let b = setRegion(start, start.modules[1].instanceId, 'root.0', { value: 'One<br>Two<br>Three' })
  b = setStyle(b, b.modules[1].instanceId, 'root.0', { margin: { top: '8px' }, class: 'lead' })
  const out = renderBuild(b, cat, { parse })
  const ps = [...out.html.matchAll(/<p\b[^>]*margin:\s*8px[^>]*>/g)]
  assert.equal(ps.length, 3)
  assert.equal([...out.html.matchAll(/<p\b[^>]*class="lead"[^>]*>/g)].length, 3)
})

test('an override for an element the module does not have is ignored', () => {
  const start = base()
  const b = setStyle(start, start.modules[1].instanceId, 'root.9', { padding: { top: '99px' } })
  const out = renderBuild(b, cat, { parse })
  assert.ok(!out.html.includes('padding: 99px'))
  assert.equal(out.html, renderBuild(start, cat, { parse }).html)
})
