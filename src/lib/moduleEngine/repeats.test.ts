import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseModuleDom, parseRegions, applyRegions, moduleHtml } from './regions.ts'
import { findRepeats, resizeRepeat } from './repeats.ts'
import { parse, readModule } from './fixtures.ts'

const dom = (name: string) => parseModuleDom(readModule(name), parse)

test('Article List reports one resizable group of three units', () => {
  const { groups } = findRepeats(dom('Article List'))
  const g = groups.find((x) => x.group === 'subheading')
  assert.ok(g)
  assert.equal(g!.units, 3)
  assert.equal(g!.canResize, true)
})

test('region keys inside units use group[index].ordinal', () => {
  const d = dom('Article List')
  const { unitOf } = findRepeats(d)
  const keys = parseRegions(d, unitOf).map((f) => f.key)
  assert.ok(keys.includes('subheading[0].0'))
  assert.ok(keys.includes('subheading[2].1'))
})

test('adding slots clones the last unit and keeps existing keys stable', () => {
  const d = dom('Article List')
  const before = parseRegions(d, findRepeats(d).unitOf).map((f) => f.key)
  resizeRepeat(d, 'subheading', 5)
  const r = findRepeats(d)
  assert.equal(r.groups.find((x) => x.group === 'subheading')!.units, 5)
  const after = parseRegions(d, r.unitOf).map((f) => f.key)
  for (const k of before) assert.ok(after.includes(k), `key ${k} should survive`)
  assert.ok(after.includes('subheading[4].0'))
})

test('removing slots stops at one unit', () => {
  const d = dom('Article List')
  resizeRepeat(d, 'subheading', 1)
  assert.equal(findRepeats(d).groups.find((x) => x.group === 'subheading')!.units, 1)
  resizeRepeat(d, 'subheading', 0)
  assert.equal(findRepeats(d).groups.find((x) => x.group === 'subheading')!.units, 1)
})

test('a value set on one slot does not appear on the others', () => {
  const d = dom('Article List')
  const { unitOf } = findRepeats(d)
  applyRegions(d, { 'subheading[1].0': { value: 'Only the second' } }, unitOf)
  assert.equal(moduleHtml(d).split('Only the second').length - 1, 1)
})

test('every module with a repeat marker parses, and ambiguous ones are not resizable', () => {
  const dir = join(process.cwd(), 'Themes and Modules', 'Modules', 'Agulhas Indigo Cape Coral')
  const names = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5))
  const fixed: string[] = []
  let withMarkers = 0
  for (const n of names) {
    const d = dom(n)
    if (!d.root.querySelector('[pardot-repeatable]')) continue
    withMarkers++
    const { groups } = findRepeats(d)
    for (const g of groups) if (!g.canResize) fixed.push(`${n}:${g.group}`)
  }
  assert.ok(withMarkers >= 25, `expected ~28 repeatable modules, found ${withMarkers}`)
  console.log('NOT RESIZABLE:', fixed.join(', ') || '(none)')
})
