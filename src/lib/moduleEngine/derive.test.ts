import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveCta } from './derive.ts'
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
