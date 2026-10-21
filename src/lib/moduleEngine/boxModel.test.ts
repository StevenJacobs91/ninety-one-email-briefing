import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyBox, moduleContainer, normaliseClass, normaliseLength, readBox } from './boxModel.ts'
import { parseModuleDom, regionElements } from './regions.ts'
import { parse, readModule } from './fixtures.ts'

const el = (style: string, cls = '') => {
  const doc = parse(`<html><body><p id="x" style="${style}"${cls ? ` class="${cls}"` : ''}>t</p></body></html>`)
  return doc.getElementById('x') as unknown as Element
}

test('padding and margin shorthands are read as four sides (one, two, three and four values)', () => {
  assert.deepEqual(readBox(el('padding: 30px 40px 30px 40px;')).padding, { top: '30px', right: '40px', bottom: '30px', left: '40px' })
  assert.deepEqual(readBox(el('margin: 5px;')).margin, { top: '5px', right: '5px', bottom: '5px', left: '5px' })
  assert.deepEqual(readBox(el('margin: 1px 2px;')).margin, { top: '1px', right: '2px', bottom: '1px', left: '2px' })
  assert.deepEqual(readBox(el('margin: 0px 0 0px;')).margin, { top: '0px', right: '0', bottom: '0px', left: '0' })
})

test('a side property written after a shorthand wins, and nothing set reads as empty', () => {
  const box = readBox(el('padding: 10px; padding-left: 25px;'))
  assert.equal(box.padding.left, '25px')
  assert.equal(box.padding.top, '10px')
  assert.deepEqual(readBox(el('color: red;')).margin, { top: '', right: '', bottom: '', left: '' })
})

test('the class attribute is read as written', () => {
  assert.equal(readBox(el('', 'stack-mobile-none darkmode')).class, 'stack-mobile-none darkmode')
  assert.equal(readBox(el('')).class, '')
})

test('setting one side keeps the others and rewrites padding as one shorthand', () => {
  const p = el('font-size: 16px; padding: 30px 40px 30px 40px;')
  applyBox(p, { padding: { top: '10px' } })
  assert.match(p.getAttribute('style')!, /padding: 10px 40px 30px 40px/)
  assert.ok(!/padding-/.test(p.getAttribute('style')!))
  assert.match(p.getAttribute('style')!, /font-size: 16px/)
})

test('a margin is added where the element had none', () => {
  const p = el('color: red;')
  applyBox(p, { margin: { bottom: '20px' } })
  assert.match(p.getAttribute('style')!, /margin: 0 0 20px 0/)
})

test('a number alone means pixels, and a value that is not a length is ignored', () => {
  assert.equal(normaliseLength('12'), '12px')
  assert.equal(normaliseLength(' 1.5em '), '1.5em')
  assert.equal(normaliseLength('0'), '0')
  assert.equal(normaliseLength('-8px'), '-8px')
  assert.equal(normaliseLength('auto'), 'auto')
  assert.equal(normaliseLength('12px; color: red'), null)
  assert.equal(normaliseLength('abc'), null)
  assert.equal(normaliseLength(''), '')
  const p = el('padding: 4px;')
  applyBox(p, { padding: { top: 'abc', left: '9' } })
  assert.match(p.getAttribute('style')!, /padding: 4px 4px 4px 9px/)
})

test('the class can be replaced or cleared, and only safe characters are kept', () => {
  const p = el('', 'old')
  applyBox(p, { class: 'a  b-c' })
  assert.equal(p.getAttribute('class'), 'a b-c')
  applyBox(p, { class: '' })
  assert.ok(!p.getAttribute('class'))
  assert.equal(normaliseClass('ok"><script>'), 'okscript')
})

test('an empty edit changes nothing', () => {
  const p = el('padding: 4px;', 'k')
  applyBox(p, {})
  assert.equal(p.getAttribute('style'), 'padding: 4px;')
  assert.equal(p.getAttribute('class'), 'k')
})

test('the module container is the outer cell that carries the padding', () => {
  const dom = parseModuleDom(readModule('Body Content'), parse)
  const container = moduleContainer(dom)!
  assert.equal(container.tagName.toLowerCase(), 'td')
  assert.match(container.getAttribute('style') ?? '', /padding:\s*30px 40px 30px 40px/)
  assert.ok(container.contains(regionElements(dom)[0]))
})
