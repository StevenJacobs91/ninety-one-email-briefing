import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isAutoEditable, parseModuleDom, parseRegions, moduleHtml, applyRegions } from './regions.ts'
import { describeModule } from './describe.ts'
import { renderBuild } from './render.ts'
import { newModule, setRegion } from './build.ts'
import { parse } from './fixtures.ts'

const PM = `<tr><td><table><tr><td>
<h3 pardot-region="detail" style="color:#CF6F13">RAs: The season</h3>
<p style="margin:0">Marc <strong>Lindley</strong> shares some strategies.</p></td></tr>
<tr><td><p pardot-region="detail"><a href="#x" pardot-region="button">Read more</a></p></td></tr></table></td></tr>`

const fields = (html: string, auto = true) => parseRegions(parseModuleDom(html, parse, { auto }))

test('text the design never marked as editable becomes editable, after the marked regions so saved keys are unchanged', () => {
  const f = fields(PM)
  assert.deepEqual(f.map((x) => x.key), ['root.0', 'root.1', 'root.a0'])
  assert.equal(f[2].kind, 'rich')
  assert.ok(f[2].value.includes('shares some strategies'))
  assert.deepEqual(fields(PM, false).map((x) => x.key), ['root.0', 'root.1'])
})

test('editing it changes the text and leaves no editing marker in the email', () => {
  const dom = parseModuleDom(PM, parse, { auto: true })
  applyRegions(dom, { 'root.a0': { value: 'Jane <strong>Smith</strong> explains.' } })
  const out = moduleHtml(dom)
  assert.ok(out.includes('Jane') && out.includes('explains.'))
  assert.ok(!out.includes('shares some strategies'))
  assert.ok(!out.includes('data-auto-region'))
})

test('spacers, hidden text, styles and text inside a marked region are left alone', () => {
  const html = `<tr><td>&nbsp;</td><td><div style="display:none">Preheader words</div><style>.a{color:red}</style>
    <p pardot-region="paragraph">Marked <span>inner words</span></p><td> </td></td></tr>`
  assert.deepEqual(fields(html).map((x) => x.key), ['root.0'])
})

test('a link outside any region is editable with its address', () => {
  const f = fields('<tr><td><a href="https://x.test/a">Listen now</a></td></tr>')
  assert.equal(f.length, 1)
  assert.equal(f[0].value, 'Listen now')
  assert.equal(f[0].href, 'https://x.test/a')
})

test('text in a cell and in a list item is editable, once each', () => {
  const f = fields('<tr><td>Cell words</td><td><ul><li>Item one</li><li>Item two</li></ul></td></tr>')
  assert.deepEqual(f.map((x) => x.value), ['Cell words', 'Item one', 'Item two'])
})

test('a cell holding an image and text is not rewritten around the image', () => {
  const f = fields('<tr><td><img src="https://x/a.png" width="200">Caption words</td></tr>')
  assert.equal(f.length, 0)
})

test('legal text, headers and the greeting are fixed, but footers are editable', () => {
  for (const n of ['Disclaimer - UK', 'Risk Warnings - UK', 'Small Header', 'Header with Image', 'Greeting', 'Visually Hidden Preheader Text']) assert.equal(isAutoEditable(n), false, n)
  for (const n of ['Footer v1', 'Footer V3', 'PM 1', 'Body Content', 'Numbered Section V1', 'Podcast Module']) assert.equal(isAutoEditable(n), true, n)
})

test('describing lists fields in reading order, with headings and links named', () => {
  const info = describeModule('PM 1', PM, parse)
  assert.deepEqual(info.fields.map((x) => x.key), ['root.0', 'root.a0', 'root.1'])
  const withLink = describeModule('X', '<tr><td><a href="#">Listen now</a></td></tr>', parse)
  assert.equal(withLink.fields[0].label, 'Link')
})

test('rendering applies an edit to the unmarked text', () => {
  const cat = { themeId: 't', shell: { head: '', tail: '' }, order: ['PM 1'], modules: { 'PM 1': PM } }
  let b = { version: 1 as const, themeId: 't', modules: [newModule('PM 1')] }
  b = setRegion(b, b.modules[0].instanceId, 'root.a0', { value: 'Brand new words' })
  const out = renderBuild(b, cat, { parse }).html
  assert.ok(out.includes('Brand new words'))
  assert.ok(!out.includes('data-auto-region'))
})

test('a link with an icon beside its words is editable and keeps the icon', () => {
  const html = '<tr><td><a href="#">Read more&nbsp; <img src="https://x/arrow_12x12.png" height="12"></a></td></tr>'
  const dom = parseModuleDom(html, parse, { auto: true })
  const f = parseRegions(dom)
  assert.equal(f.length, 1)
  applyRegions(dom, { 'root.a0': { value: 'Find out more' } })
  const out = moduleHtml(dom)
  assert.ok(out.includes('Find out more') && out.includes('arrow_12x12.png'))
})
