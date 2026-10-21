import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND_TINTS } from '../brandTints.ts'
import { THEME_COLOURS } from '../themeColours.ts'

// Brand audit over the generated library: what a sent email can contain.
const DIR = join(process.cwd(), 'public', 'module-catalogue')
const ids = Object.keys(THEME_COLOURS)
const load = (id: string) => JSON.parse(readFileSync(join(DIR, `${id}.json`), 'utf8')) as { shell: { head: string; tail: string }; modules: Record<string, string> }
const hexes = (html: string) => [...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase())

test('the catalogue has been generated for every brand theme', { skip: !existsSync(DIR) }, () => {
  for (const id of ids) assert.ok(existsSync(join(DIR, `${id}.json`)), id)
})

test('each theme\'s colour block is its own brand colours (primary, three tints, accent)', { skip: !existsSync(DIR) }, () => {
  for (const id of ids) {
    const { primary, accent } = THEME_COLOURS[id]
    const t = BRAND_TINTS[primary]
    const head = load(id).shell.head
    const get = (cls: string) => head.match(new RegExp(`\\.${cls}\\s*\\{[^}]*?(#[0-9a-fA-F]{6})`))?.[1].toLowerCase()
    assert.deepEqual(
      [get('primary-color'), get('tint-01-color'), get('tint-02-color'), get('tint-03-color'), get('accent-color')],
      [primary, t.tint01, t.tint02, t.tint03, accent], id,
    )
  }
})

test('no theme\'s email uses another colour family\'s primary or tints', { skip: !existsSync(DIR) }, () => {
  const own = (id: string) => new Set([THEME_COLOURS[id].primary, THEME_COLOURS[id].accent, ...Object.values(BRAND_TINTS[THEME_COLOURS[id].primary])])
  // Springbok Cream is also the text colour on every dark theme, so it is not treated as a family here.
  const families = Object.entries(BRAND_TINTS).filter(([p]) => p !== '#e8e5ce')
  for (const id of ids) {
    const { shell, modules } = load(id)
    const used = new Set(hexes(shell.head + shell.tail + Object.values(modules).join('\n')))
    const mine = own(id)
    const foreign = families.flatMap(([p, t]) => [p, ...Object.values(t)]).filter((h) => used.has(h) && !mine.has(h))
    assert.deepEqual(foreign, [], `${id} uses another family's colours`)
  }
})

test('the unsubscribe link is never the near-invisible olive #424224, and carries the dark-mode link class', { skip: !existsSync(DIR) }, () => {
  for (const id of ids) {
    const { modules } = load(id)
    for (const [name, html] of Object.entries(modules)) {
      if (!/Unsubscribe/.test(html)) continue
      assert.ok(!html.includes('#424224'), `${id} / ${name}`)
      for (const a of html.match(/<a [^>]*href="\{\{Unsubscribe\}\}"[^>]*>/g) ?? []) assert.match(a, /class="link"/, `${id} / ${name}`)
    }
  }
})

test('the brand cream is #e8e5ce everywhere (no #e8e5cf typo)', { skip: !existsSync(DIR) }, () => {
  for (const id of ids) {
    const { shell, modules } = load(id)
    assert.ok(!/#e8e5cf\b/i.test(shell.head + shell.tail + Object.values(modules).join('\n')), id)
  }
})
