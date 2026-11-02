import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveButtonLabels, deriveCta } from './derive.ts'
import { describeModule } from './describe.ts'
import { seedBuild } from './seed.ts'
import { addModule, setRegion } from './build.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

const cat: ThemeCatalogue = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-coral.json'), 'utf8'),
)

test('no button module means no CTA', () => {
  assert.equal(deriveCta(seedBuild('agulhas-coral'), cat, parse), null)
})

test('an unedited button module (library placeholder text) is not a CTA', () => {
  const b = addModule(seedBuild('agulhas-coral'), 'Single Primary CTA', 2)
  assert.equal(deriveCta(b, cat, parse), null)
})

test('the first edited button supplies the CTA label and url', () => {
  let b = addModule(seedBuild('agulhas-coral'), 'Single Primary CTA', 2)
  const id = b.modules[2].instanceId
  b = setRegion(b, id, 'root.0', { value: 'Read the report', href: 'https://example.com/r' })
  assert.deepEqual(deriveCta(b, cat, parse), { label: 'Read the report', url: 'https://example.com/r' })
})

test('a label without a url still yields the label', () => {
  let b = addModule(seedBuild('agulhas-coral'), 'Single Primary CTA', 2)
  b = setRegion(b, b.modules[2].instanceId, 'root.0', { value: 'Register now' })
  assert.deepEqual(deriveCta(b, cat, parse), { label: 'Register now', url: '' })
})

test('every edited button supplies its label, in the order they appear in the email', () => {
  let b = addModule(seedBuild('agulhas-coral'), 'Primary and Secondary CTA', 2)
  b = addModule(b, 'Single Primary CTA', 3)
  const pair = b.modules[2]
  const keys = describeModule(pair.moduleName, cat.modules[pair.moduleName], parse).fields.filter((f) => f.kind === 'button').map((f) => f.key)
  assert.equal(keys.length, 2)
  b = setRegion(b, pair.instanceId, keys[0], { value: 'Read the letter', href: 'https://example.com/a' })
  b = setRegion(b, pair.instanceId, keys[1], { value: 'Download the complete fund fact sheet', href: 'https://example.com/b' })
  b = setRegion(b, b.modules[3].instanceId, 'root.0', { value: '  Register now  ', href: 'https://example.com/c' })
  assert.deepEqual(deriveButtonLabels(b, cat, parse), ['Read the letter', 'Download the complete fund fact sheet', 'Register now'])
})

test('buttons left at their library placeholder text, and an email with no buttons, give no labels', () => {
  assert.deepEqual(deriveButtonLabels(seedBuild('agulhas-coral'), cat, parse), [])
  assert.deepEqual(deriveButtonLabels(addModule(seedBuild('agulhas-coral'), 'Single Primary CTA', 2), cat, parse), [])
})
