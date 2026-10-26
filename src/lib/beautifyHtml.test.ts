import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beautifyHtml } from './beautifyHtml.ts'

const MESSY = '<tr><td bgcolor="{{primary}}" style="padding: 0px 40px;"><table width="100%"><tbody><tr><td><p>Hello <b>there</b>, {{Recipient.FirstName}}</p></td></tr></tbody></table></td></tr>'

test('nested tables are indented two spaces a level, one tag per line', () => {
  const out = beautifyHtml(MESSY)
  const lines = out.split('\n')
  assert.ok(lines.length > 6, 'put on separate lines')
  assert.equal(lines[0], '<tr>')
  assert.ok(lines[1].startsWith('  <td '))
  assert.ok(lines.some((l) => l.startsWith('      <tbody>')), 'the tbody sits inside the table inside the cell')
})

test('tokens, merge tags and conditional comments come through untouched', () => {
  const html = '<!--[if mso]><table><tr><td><![endif]-->\n<tr><td bgcolor="{{primary}}" style="color: {{accent}};">{{#if Recipient.FirstName}}Dear {{Recipient.FirstName}}{{else}}Good day{{/if}} <a href="{{Unsubscribe}}">x</a></td></tr>\n<!--[if mso]></td></tr></table><![endif]-->'
  const out = beautifyHtml(html)
  for (const piece of ['<!--[if mso]>', '<![endif]-->', '{{primary}}', '{{accent}}', '{{#if Recipient.FirstName}}', '{{else}}', '{{/if}}', '{{Unsubscribe}}']) assert.ok(out.includes(piece), piece)
})

test('text keeps its words and inline tags stay inline', () => {
  const out = beautifyHtml(MESSY)
  assert.ok(out.includes('Hello <b>there</b>, {{Recipient.FirstName}}'))
})

test('formatting twice changes nothing more', () => {
  const once = beautifyHtml(MESSY)
  assert.equal(beautifyHtml(once), once)
})
