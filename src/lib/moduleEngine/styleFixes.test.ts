import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fixModuleStyles } from './styleFixes.ts'
import { readModule } from './fixtures.ts'

test('the Greeting cell has no top padding and 30px below, with 40px at the sides', () => {
  const out = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.ok(out.includes('padding: 0px 40px 30px 40px;'))
  assert.ok(!out.includes('padding: 30px 40px 30px 40px;'))
})

test('the greeting paragraph adds no margin of its own below', () => {
  const out = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.ok(!/margin: 0px 0 15px/.test(out))
})

test('only the Greeting module is changed', () => {
  const html = readModule('Body Content')
  assert.equal(fixModuleStyles('Body Content', html), html)
})

test('the fix applies to the Greeting module of every theme', () => {
  const root = join(process.cwd(), 'Themes and Modules', 'Modules')
  const themes = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  assert.ok(themes.length >= 15)
  for (const t of themes) {
    const out = fixModuleStyles('Greeting', readFileSync(join(root, t, 'Greeting.html'), 'utf8'))
    assert.ok(out.includes('padding: 0px 40px 30px 40px;'), `${t} was not fixed`)
  }
})

test('fixing twice changes nothing more', () => {
  const once = fixModuleStyles('Greeting', readModule('Greeting'))
  assert.equal(fixModuleStyles('Greeting', once), once)
})
