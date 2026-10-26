import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { htmlToPlainText } from './htmlToPlainText.ts'
import { renderBuild } from './moduleEngine/render.ts'
import { seedBuild } from './moduleEngine/seed.ts'
import { parse } from './moduleEngine/fixtures.ts'

const EMAIL = `<html><head><title>Hidden title</title><style>p{color:red}</style></head><body>
<div style="display:none;max-height:0;overflow:hidden">Preview line nobody sees</div>
<table><tbody><tr><td><a href="https://ninetyone.com"><img alt="Ninety One" src="https://x/logo.png"></a></td></tr>
<tr><td><h1>Women &amp; Investing</h1><h2>October edition</h2>
<p>{{#if Recipient.FirstName}}Dear {{Recipient.FirstName}},{{else}}Good day.{{/if}}</p>
<p>Markets <b>diverged</b> in the third quarter.&nbsp;Read the <a href="https://ninetyone.com/insights?utm_campaign=x">full insights</a> or write to <a href="mailto:team@ninetyone.com">team@ninetyone.com</a>.</p>
<ul><li>First point</li><li>Second <a href="#top">point</a></li></ul>
<ol><li>One</li><li>Two</li></ol>
<table><tbody><tr><td><a href="https://ninetyone.com/register" style="background:#cf6f13">Register now</a></td></tr></tbody></table>
<hr><p>Line one<br>Line two</p>
<p><a href="{{Unsubscribe}}">Unsubscribe</a></p>
</td></tr></tbody></table></body></html>`

test('the email reads as plain text: headings and paragraphs on their own lines, nothing hidden, no tags', () => {
  const text = htmlToPlainText(EMAIL, parse)
  assert.ok(!/<[a-z/]/i.test(text), 'no tags')
  assert.ok(!text.includes('Preview line nobody sees') && !text.includes('Hidden title') && !text.includes('color:red'))
  const lines = text.split('\n')
  assert.ok(lines.includes('WOMEN & INVESTING'), 'the main heading is in capitals')
  assert.ok(lines.includes('October edition'))
  assert.ok(text.includes('{{#if Recipient.FirstName}}Dear {{Recipient.FirstName}},{{else}}Good'), 'merge tags kept whole')
  assert.ok(text.includes('day.{{/if}}'))
  assert.ok(text.includes('Markets diverged in the third quarter. Read the full insights'))
  assert.ok(!/\n\n\n/.test(text), 'never more than one blank line')
  assert.ok(!text.startsWith('\n') && !text.endsWith('\n'))
})

test('links keep their address: "text (address)", mail addresses alone, anchors and merge links sensibly', () => {
  const text = htmlToPlainText(EMAIL, parse)
  const flat = text.replace(/\s+/g, ' ') // a long line wraps, so read it as one
  assert.ok(flat.includes('full insights (https://ninetyone.com/insights?utm_campaign=x)'))
  assert.ok(flat.includes('write to team@ninetyone.com.'), 'a mail link whose text is the address is not repeated')
  assert.ok(text.includes('Register now (https://ninetyone.com/register)'), 'a button shows where it goes')
  assert.ok(text.includes('Unsubscribe ({{Unsubscribe}})'))
  assert.ok(text.includes('- Second point') && !text.includes('#top'), 'a link to an anchor on the page is just its text')
  assert.ok(text.startsWith('[Ninety One] https://ninetyone.com') || text.startsWith('Ninety One (https://ninetyone.com)') || text.startsWith('[Ninety One]'), 'an image link shows its alt text')
})

test('lists are bulleted or numbered, and a line break stays a line break', () => {
  const lines = htmlToPlainText(EMAIL, parse).split('\n')
  assert.ok(lines.includes('- First point'))
  assert.ok(lines.includes('1. One') && lines.includes('2. Two'))
  assert.ok(lines.includes('Line one') && lines.includes('Line two'))
  assert.ok(lines.includes('-'.repeat(40)), 'a rule is a line of dashes')
})

test('long paragraphs wrap so none runs past 76 characters, except an address that cannot be split', () => {
  const long = `<p>${'The quick brown fox jumps over the lazy dog. '.repeat(8)}</p><ul><li>${'A long list item that goes on and on and on. '.repeat(4)}</li></ul><p><a href="https://example.com/${'a'.repeat(120)}">x</a></p>`
  const lines = htmlToPlainText(`<html><body>${long}</body></html>`, parse).split('\n')
  const over = lines.filter((l) => l.length > 76)
  assert.equal(over.length, 1)
  assert.ok(over[0].includes('https://example.com/'))
  assert.ok(lines.some((l) => l.startsWith('  ') && l.trim().length > 0), 'a wrapped list item is indented under its bullet')
})

test('a real email from the library comes out readable, with its content and links and no markup', () => {
  const dir = join(process.cwd(), 'public', 'module-catalogue')
  const cat = JSON.parse(readFileSync(join(dir, 'agulhas-gold.json'), 'utf8'))
  const html = renderBuild(seedBuild('agulhas-gold'), cat, { parse, previewText: 'Preview line for the inbox' }).html
  const text = htmlToPlainText(html, parse)
  assert.ok(text.length > 200)
  assert.ok(!/<[a-z/][^>]*>/i.test(text), 'no tags')
  assert.ok(!/(font-family|bgcolor|cellpadding|pardot-region)/i.test(text), 'no attributes')
  assert.ok(!text.includes('Preview line for the inbox'), 'the hidden preview line is not shown')
  assert.ok(text.split('\n').every((l) => l.length <= 76 || !l.includes(' ') || /https?:/.test(l)))
})
