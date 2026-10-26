import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_HTML_MODULES, LIBRARY_MODULES, mergeHtmlModules } from './settingsDefaults.ts'
import { DEFAULT_MODULE_CATEGORIES } from './moduleCategories.ts'

const DIR = join(process.cwd(), 'public', 'module-catalogue')
const inLibrary = new Set<string>()
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  const cat = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { order: string[] }
  cat.order.forEach((n) => inLibrary.add(n))
}

test('every module the builder can offer, in any theme, has an entry in Settings → Email Modules', () => {
  const settings = new Set(DEFAULT_HTML_MODULES.map((m) => m.label))
  const missing = [...inLibrary].filter((n) => !settings.has(n))
  assert.deepEqual(missing, [], 'add these to LIBRARY_MODULES in settingsDefaults.ts')
})

test('Settings lists nothing the library does not have, each module once, each in a real category', () => {
  assert.deepEqual(LIBRARY_MODULES.filter((n) => !inLibrary.has(n)), [], 'these are not in the library any more')
  const labels = DEFAULT_HTML_MODULES.map((m) => m.label)
  const ids = DEFAULT_HTML_MODULES.map((m) => m.id)
  assert.equal(new Set(labels).size, labels.length)
  assert.equal(new Set(ids).size, ids.length)
  const categories = new Set(DEFAULT_MODULE_CATEGORIES.map((c) => c.id))
  assert.deepEqual(DEFAULT_HTML_MODULES.filter((m) => !categories.has(m.category)), [])
  assert.ok(DEFAULT_HTML_MODULES.every((m) => m.enabled))
})

test('Dual Author Module, and the other modules the list used to miss, are in Settings under the right category', () => {
  const by = (label: string) => DEFAULT_HTML_MODULES.find((m) => m.label === label)
  assert.equal(by('Dual Author Module')?.category, 'People')
  assert.equal(by('Dual Author Module V2')?.category, 'People')
  assert.equal(by('Footer v1')?.category, 'Footers')
  assert.equal(by('Small Header v2')?.category, 'Headers')
  assert.equal(by('Disclaimer - UK')?.category, 'Legal')
  assert.equal(by('Event Registration v5 (full-bleed)')?.category, 'Events')
})

test('saved settings keep what was set for a library module, keep modules added in Settings, and lose the old invented entries', () => {
  const saved = [
    { id: 'speakers', label: 'Speakers', description: 'x', category: 'Speakers', enabled: false, layoutIcon: 'columns2' },
    { id: 'footer-v1', label: 'Footer (Standard)', description: 'old invented entry', category: 'Footers', enabled: true },
    { id: 'promo', label: 'Promo Banner', description: 'mine', category: 'Content', enabled: true, html: '<tr><td>Hi</td></tr>' },
    { id: 'body-content', label: 'Body Content', description: 'old', category: 'Content', enabled: true, html: '<tr><td>Pasted over the library</td></tr>' },
  ] as never
  const merged = mergeHtmlModules(saved)
  const labels = merged.map((m) => m.label)
  assert.ok(LIBRARY_MODULES.every((n) => labels.includes(n)), 'every library module is there')
  const speakers = merged.find((m) => m.label === 'Speakers')!
  assert.equal(speakers.enabled, false, 'switched off stays off')
  assert.equal(speakers.layoutIcon, 'columns2')
  assert.equal(speakers.id, 'speakers')
  assert.ok(!labels.includes('Footer (Standard)'), 'an entry that matched nothing and had no code is gone')
  assert.equal(merged.find((m) => m.label === 'Promo Banner')?.html, '<tr><td>Hi</td></tr>', 'one added in Settings stays')
  assert.equal(merged.find((m) => m.label === 'Body Content')?.html, '<tr><td>Pasted over the library</td></tr>', 'code pasted over a library module stays')
  assert.equal(merged.length, LIBRARY_MODULES.length + 1)
  assert.deepEqual(labels.slice(0, LIBRARY_MODULES.length), [...LIBRARY_MODULES], 'the library order comes first, mine after')
})

test('with nothing saved, Settings starts with the full library; and a module added in Settings never shares an id with one', () => {
  assert.deepEqual(mergeHtmlModules(undefined).map((m) => m.label), [...LIBRARY_MODULES])
  const merged = mergeHtmlModules([{ id: 'greeting', label: 'My Greeting', description: '', category: 'Content', enabled: true, html: '<tr><td>x</td></tr>' }] as never)
  const ids = merged.map((m) => m.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('greeting-custom'))
})
