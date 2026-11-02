import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { applyButtonWidths, buttonRows, PAIR_SPLITS, SINGLE_WIDTHS } from './buttonWidths.ts'
import { parseModuleDom } from './regions.ts'
import { describeModule } from './describe.ts'
import { renderBuild } from './render.ts'
import { newModule, setButtonWidths } from './build.ts'
import { parse } from './fixtures.ts'

const DIR = join(process.cwd(), 'public', 'module-catalogue')
const themes = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')
const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { themeId: string; order: string[]; modules: Record<string, string> }
const module_ = (name: string, file = 'agulhas-gold.json') => load(file).modules[name]

const rowsOf = (html: string) => buttonRows(parseModuleDom(html, parse, { auto: false }).root)
const widthsOf = (cells: Element[]) => cells.map((c) => c.getAttribute('width'))
const apply = (html: string, widths: Record<string, number[]>) => {
  const dom = parseModuleDom(html, parse, { auto: false })
  applyButtonWidths(dom.root, widths)
  return buttonRows(dom.root)
}

test('every theme\'s button modules report their buttons row by row', () => {
  assert.ok(themes.length >= 15)
  for (const file of themes) {
    const count = (name: string) => rowsOf(module_(name, file)).map((r) => r.buttons.length)
    assert.deepEqual(count('Single Primary CTA'), [1], `${file} single primary`)
    assert.deepEqual(count('Single Secondary CTA'), [1], `${file} single secondary`)
    assert.deepEqual(count('Primary and Secondary CTA'), [2], `${file} primary and secondary`)
    assert.deepEqual(count('Dual Secondary CTA'), [2], `${file} dual secondary`)
    assert.deepEqual(count('1x Primary CTA 2x Secondary CTA'), [3], `${file} three in a row`)
  }
})

test('a module with no buttons has no button rows', () => {
  assert.deepEqual(rowsOf(module_('Footer v1')), [])
  assert.deepEqual(describeModule('Footer v1', module_('Footer v1'), parse).buttonRows, [])
})

test('describing a button module says how many buttons are in each row', () => {
  assert.deepEqual(describeModule('Single Primary CTA', module_('Single Primary CTA'), parse).buttonRows, [1])
  assert.deepEqual(describeModule('Primary and Secondary CTA', module_('Primary and Secondary CTA'), parse).buttonRows, [2])
  assert.deepEqual(describeModule('1x Primary CTA 2x Secondary CTA', module_('1x Primary CTA 2x Secondary CTA'), parse).buttonRows, [3])
})

test('a single button can be made wider, and the space beside it takes what is left', () => {
  const [row] = apply(module_('Single Primary CTA'), { '0': [70] })
  assert.equal(row.buttons[0].getAttribute('width'), '70%')
  const rest = row.cells.filter((c) => !row.buttons.includes(c))
  assert.equal(rest.reduce((sum, c) => sum + parseInt(c.getAttribute('width') ?? '0', 10), 0), 30)
})

test('a single button at 100% leaves no space beside it', () => {
  const [row] = apply(module_('Single Primary CTA'), { '0': [100] })
  assert.equal(row.cells.length, 1)
  assert.equal(row.buttons[0].getAttribute('width'), '100%')
})

test('two buttons share the row in the chosen split, with the 2% gap kept between them', () => {
  const cases: [number, number, string[]][] = [
    [50, 50, ['49%', '2%', '49%']],
    [30, 70, ['29%', '2%', '69%']],
    [40, 60, ['39%', '2%', '59%']],
    [60, 40, ['59%', '2%', '39%']],
    [70, 30, ['69%', '2%', '29%']],
  ]
  for (const [a, b, expected] of cases) {
    const [row] = apply(module_('Primary and Secondary CTA'), { '0': [a, b] })
    assert.deepEqual(widthsOf(row.cells), expected, `${a}/${b}`)
    assert.equal(row.buttons.length, 2)
  }
})

test('three buttons in a row are left as designed, whatever widths are given', () => {
  const module = module_('1x Primary CTA 2x Secondary CTA')
  const before = widthsOf(rowsOf(module)[0].cells)
  assert.deepEqual(widthsOf(apply(module, { '0': [30, 70] })[0].cells), before)
  assert.deepEqual(widthsOf(apply(module, { '0': [50] })[0].cells), before)
})

test('widths that do not fit the row are left alone', () => {
  const before = widthsOf(rowsOf(module_('Single Primary CTA'))[0].cells)
  assert.deepEqual(widthsOf(apply(module_('Single Primary CTA'), { '0': [30, 70] })[0].cells), before, 'a pair for a single button')
  assert.deepEqual(widthsOf(apply(module_('Single Primary CTA'), { '5': [70] })[0].cells), before, 'a row the module does not have')
  const pair = widthsOf(rowsOf(module_('Dual Secondary CTA'))[0].cells)
  assert.deepEqual(widthsOf(apply(module_('Dual Secondary CTA'), { '0': [70] })[0].cells), pair, 'one width for a pair')
})

test('the choices offered are the ones asked for', () => {
  assert.ok([30, 40, 50, 60, 70, 80, 90, 100].every((w) => SINGLE_WIDTHS.includes(w)))
  assert.ok([30, 40, 50, 60, 70].every((a) => PAIR_SPLITS.includes(a)))
})

test('the email is rendered with the chosen widths, and unchanged without them', () => {
  const cat = load('agulhas-gold.json')
  const make = (widths?: Record<string, number[]>) => {
    let b = { version: 1 as const, themeId: cat.themeId, modules: [newModule('Primary and Secondary CTA')] }
    if (widths) b = setButtonWidths(b, b.modules[0].instanceId, 0, widths['0'])
    return renderBuild(b, { ...cat, shell: { head: '', tail: '' } }, { parse }).html
  }
  const plain = make()
  const wide = make({ '0': [30, 70] })
  assert.ok(wide.includes('width="29%"') && wide.includes('width="69%"'))
  assert.ok(!plain.includes('width="29%"'))
})

test('choosing the design\'s own widths again takes the setting out of the build', () => {
  const cat = load('agulhas-gold.json')
  let b = { version: 1 as const, themeId: cat.themeId, modules: [newModule('Primary and Secondary CTA')] }
  const id = b.modules[0].instanceId
  b = setButtonWidths(b, id, 0, [30, 70])
  assert.deepEqual(b.modules[0].buttonWidths, { '0': [30, 70] })
  b = setButtonWidths(b, id, 0, undefined)
  assert.equal(b.modules[0].buttonWidths, undefined)
})
