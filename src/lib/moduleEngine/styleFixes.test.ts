import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fixModuleStyles } from './styleFixes.ts'
import { readModule } from './fixtures.ts'

test('the Greeting cell has 30px above, 15px below and 40px at the sides', () => {
  const out = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.ok(out.includes('padding: 30px 40px 15px 40px;'))
  assert.ok(!out.includes('padding: 30px 40px 30px 40px;'))
})

test('the Body Content cell has no top padding and 30px below', () => {
  const out = fixModuleStyles('Body Content', readModule('Body Content'))
  assert.ok(out.includes('padding: 0px 40px 30px 40px;'))
  assert.ok(!out.includes('padding: 30px 40px 30px 40px;'))
})

test('the greeting paragraph adds no margin of its own below', () => {
  const out = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.ok(!/margin: 0px 0 15px/.test(out))
})

test('other modules are not changed', () => {
  const html = readModule('Footer v1')
  assert.equal(fixModuleStyles('Footer v1', html), html)
})

test('the fix applies to the Greeting module of every theme', () => {
  const root = join(process.cwd(), 'Themes and Modules', 'Modules')
  const themes = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  assert.ok(themes.length >= 15)
  for (const t of themes) {
    const out = fixModuleStyles('Greeting', readFileSync(join(root, t, 'Greeting.html'), 'utf8'))
    assert.ok(out.includes('padding: 30px 40px 15px 40px;'), `${t} greeting was not fixed`)
    const body = fixModuleStyles('Body Content', readFileSync(join(root, t, 'Body Content.html'), 'utf8'))
    assert.ok(body.includes('padding: 0px 40px 30px 40px;'), `${t} body content was not fixed`)
  }
})

test('fixing twice changes nothing more', () => {
  const once = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.equal(fixModuleStyles('Greeting', once), once)
})

// ─── Brand corrections to the supplied library (found in the brand audit) ───

const UNSUB = '<a href="{{Unsubscribe}}" style="color:#424224; text-decoration: none" target="_blank" title=""><strong>unsubscribe here</strong></a>'

test('the unsubscribe link is the brand grey and gets the link class, so dark mode makes it legible', () => {
  for (const name of ['Disclaimer', 'Disclaimer - UK']) {
    const out = fixModuleStyles(name, `<p>If you no longer wish, you are welcome to ${UNSUB}.</p>`)
    assert.ok(!out.includes('#424224'), name)
    assert.match(out, /<a href="\{\{Unsubscribe\}\}" class="link" style="color:#424242; text-decoration: none"/, name)
  }
})

test('other modules are not touched by the disclaimer correction', () => {
  assert.equal(fixModuleStyles('Body Content', UNSUB, 'agulhas-coral'), UNSUB)
})

test('the Plain Logo Header cream is the brand cream, #e8e5ce', () => {
  assert.equal(fixModuleStyles('Plain Logo Header', 'color: #e8e5cf; text-align: left;'), 'color: #e8e5ce; text-align: left;')
})

test('in Warm Yellowwood the Small Header uses Leatherback Green, not Marula Green', () => {
  const html = '<td bgcolor="#0a3323" style="background-color:#0a3323"><v:fill color="#0a3323"></v:fill></td>'
  const fixed = fixModuleStyles('Small Header', html, 'leatherback-yellowood')
  assert.ok(!/#0a3323/i.test(fixed))
  assert.equal([...fixed.matchAll(/#0d3232/g)].length, 3)
  assert.equal(fixModuleStyles('Small Header', html, 'marula-coral'), html)
})
