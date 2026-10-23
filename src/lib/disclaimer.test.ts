import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultDisclaimerFor, disclaimerParagraphs, disclaimerSource, disclaimerToText } from './disclaimer.ts'
import { renderBuild } from './moduleEngine/render.ts'
import { newModule, setDisclaimer } from './moduleEngine/build.ts'
import { templateFromBuild } from './campaignTemplate.ts'
import { parse } from './moduleEngine/fixtures.ts'

const d = (id: string, region: string, isDefault: boolean, text = id) => ({ id, label: id, region, text, isDefault })

test('a plain-text disclaimer reads as paragraphs, one per line', () => {
  assert.deepEqual(disclaimerParagraphs(disclaimerSource(d('a', 'ZA', true, 'First para.\nSecond <b>para</b>.'))), ['First para.', 'Second &lt;b&gt;para&lt;/b&gt;.'])
})

test('rich text keeps bold, italic, underline, links and sizes, plain bold and not the brand accent', () => {
  const [p] = disclaimerParagraphs('<b>Bold</b> <i>it</i> <u>un</u> <a href="https://x.test">link</a> <span style="font-size: 12px; color: red">big</span>')
  assert.ok(p.includes('<strong>Bold</strong>'))
  assert.ok(p.includes('<i>it</i>') && p.includes('<u>un</u>'))
  assert.ok(p.includes('href="https://x.test"'))
  assert.ok(p.includes('font-size: 12px'))
  assert.ok(!p.includes('color'))
})

test('sizes stay readable and nothing that could run survives', () => {
  const [p] = disclaimerParagraphs('<span style="font-size: 90px">x</span><span style="font-size: 2px">y</span><script>bad()</script><a href="javascript:bad()" onclick="evil()">z</a>')
  assert.ok(!p.includes('90px') && !p.includes('2px'))
  assert.ok(!p.includes('<script') && !p.includes('onclick') && !p.includes('javascript:'))
})

test('the plain version of a rich disclaimer is its words, paragraph by paragraph', () => {
  assert.equal(disclaimerToText('<p><b>One</b> &amp; two</p><p>Three</p>'), 'One & two\n\nThree')
})

test('a region\'s default is chosen from the brief\'s regions, UK first when it is one, then a global default', () => {
  const list = [d('za', 'ZA', true), d('uk', 'UK', true), d('uk2', 'UK', false), d('gl', 'GLOBAL', true)]
  assert.equal(defaultDisclaimerFor(list, ['ZA', 'UK'])?.id, 'uk')
  assert.equal(defaultDisclaimerFor(list, ['ZA'])?.id, 'za')
  assert.equal(defaultDisclaimerFor(list, ['EU'])?.id, 'gl')
  assert.equal(defaultDisclaimerFor(list.filter((x) => x.region !== 'GLOBAL'), ['EU']), null)
  assert.equal(defaultDisclaimerFor([], ['ZA']), null)
})

const MODULE = `<tr><td><table><tr><td class="stack-disclaimer" style="font-size: 10px">
<p class="disclaimer-copy" pardot-region="paragraph" style="margin: 0 0 10px;">Old one</p>
<p class="disclaimer-copy" style="margin: 0 0 10px;">Old two</p>
<p class="disclaimer-copy" style="margin: 0;">If you no longer wish to receive emails, <a href="{{Unsubscribe}}"><strong>unsubscribe here</strong></a>.</p>
</td></tr></table></td></tr>`
const cat = { themeId: 't', shell: { head: '', tail: '' }, order: ['Disclaimer'], modules: { Disclaimer: MODULE } }
const render = (html: string | null) => {
  let b = { version: 1 as const, themeId: 't', modules: [newModule('Disclaimer', 'disclaimer')] }
  b = setDisclaimer(b, b.modules[0].instanceId, html)
  return renderBuild(b, cat, { parse }).html
}

test('the chosen disclaimer replaces the module\'s wording and keeps the unsubscribe line', () => {
  const out = render('<b>Important</b>\nSecond paragraph at <span style="font-size: 12px">12</span>.')
  assert.ok(!out.includes('Old one') && !out.includes('Old two'))
  assert.ok(out.includes('<strong>Important</strong>') && out.includes('Second paragraph'))
  assert.equal((out.match(/class="disclaimer-copy"/g) ?? []).length, 3)
  assert.ok(out.indexOf('Second paragraph') < out.indexOf('unsubscribe here'))
  assert.ok(out.includes('{{Unsubscribe}}'))
})

test('with no disclaimer chosen the module keeps its own wording', () => {
  const out = render(null)
  assert.ok(out.includes('Old one') && out.includes('Old two'))
})

test('a saved template does not carry the disclaimer, which follows the brief', () => {
  let b = { version: 1 as const, themeId: 't', modules: [newModule('Disclaimer', 'disclaimer')] }
  b = setDisclaimer(b, b.modules[0].instanceId, 'Words')
  assert.equal(templateFromBuild(b).modules[0].disclaimerHtml, undefined)
})
