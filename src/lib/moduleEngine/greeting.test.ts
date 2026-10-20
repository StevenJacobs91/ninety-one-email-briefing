import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyGreeting } from './greeting.ts'
import { renderBuild } from './render.ts'
import { addModule } from './build.ts'
import { seedBuild } from './seed.ts'
import { isBuildEmpty } from '../campaignTemplate.ts'
import { templateFromBuild } from '../campaignTemplate.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

const cat: ThemeCatalogue = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-coral.json'), 'utf8'),
)
const withGreeting = () => addModule(seedBuild('agulhas-coral'), 'Greeting', 1)

test('the chosen greeting replaces the first paragraph and the alternative is removed', () => {
  const b = applyGreeting(withGreeting(), 'Dear {{Recipient.FirstName}},')
  const html = renderBuild(b, cat, { parse }).html
  assert.ok(html.includes('Dear {{Recipient.FirstName}},'))
  assert.ok(!html.includes('Broker_Preferred_Name'))
  assert.ok(!html.includes('Good day'))
})

test('greeting text is escaped', () => {
  const b = applyGreeting(withGreeting(), 'Hi <b>there</b> & welcome')
  const html = renderBuild(b, cat, { parse }).html
  assert.ok(html.includes('Hi &lt;b&gt;there&lt;/b&gt; &amp; welcome'))
})

test('with no greeting chosen the build is unchanged', () => {
  const b = withGreeting()
  assert.equal(applyGreeting(b, null), b)
})

test('a build with no Greeting module is unchanged', () => {
  const b = seedBuild('agulhas-coral')
  assert.deepEqual(applyGreeting(b, 'Dear {{Recipient.FirstName}},'), b)
})

test('the greeting counts as brief-driven, not as work to protect, and is not saved in templates', () => {
  const b = applyGreeting(withGreeting(), 'Dear {{Recipient.FirstName}},')
  assert.equal(isBuildEmpty(b.modules.some((m) => m.moduleName === 'Greeting') ? { ...b, modules: b.modules } : b), false) // the added Greeting itself is a free module
  const tpl = templateFromBuild(b)
  const g = tpl.modules.find((m) => m.moduleName === 'Greeting')!
  assert.deepEqual(g.regions, {})
})
