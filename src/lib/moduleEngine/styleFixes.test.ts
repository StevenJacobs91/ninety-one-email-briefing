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
