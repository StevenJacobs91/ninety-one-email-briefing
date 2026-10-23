import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signoffColumns, signoffHtml, signoffSummary, textToHtml } from './signoff.ts'

const base = { id: 's', name: 'S', isDefault: false }

test('plain text keeps its line breaks and escapes anything that looks like markup', () => {
  assert.equal(textToHtml('Kind regards,\n\nNinety One <b>'), 'Kind regards,<br><br>Ninety One &lt;b&gt;')
})

test('text can carry bold and links without writing any code', () => {
  const html = textToHtml('**Natalie Phillips**\n[Ninety One](https://ninetyone.com)')
  assert.ok(html.includes('<strong>Natalie Phillips</strong>'))
  assert.ok(html.includes('<a href="https://ninetyone.com"'))
  assert.ok(html.includes('>Ninety One</a>'))
})

test('web and email addresses typed in text become links', () => {
  const html = textToHtml('www.ninetyone.com\nhttps://ninetyone.com/a?b=1&c=2\nname@ninetyone.com')
  assert.ok(html.includes('<a href="https://www.ninetyone.com"'))
  assert.ok(html.includes('href="https://ninetyone.com/a?b=1&amp;c=2"'))
  assert.ok(html.includes('<a href="mailto:name@ninetyone.com"'))
})

test('a link is not wrapped twice', () => {
  const html = textToHtml('[www.ninetyone.com](https://ninetyone.com)')
  assert.equal((html.match(/<a /g) ?? []).length, 1)
})

test('a one-column signature has one block and no table', () => {
  const out = signoffHtml({ ...base, text: 'Kind regards,\nNinety One' })
  assert.ok(!out.includes('<table'))
  assert.ok(out.includes('Kind regards,<br>Ninety One'))
})

test('a two-column signature puts each side in its own cell', () => {
  const out = signoffHtml({ ...base, columns: 2, text: 'Left words', textRight: 'Right words' })
  assert.equal((out.match(/<td /g) ?? []).length, 2)
  assert.ok(out.indexOf('Left words') < out.indexOf('Right words'))
  assert.ok(out.includes('stack-column'))
})

test('code mode takes HTML, keeps links and bold, and drops anything that could run', () => {
  const out = signoffHtml({ ...base, format: 'code', text: '<strong>Natalie</strong> <a href="https://x.test" onclick="evil()">site</a><script>bad()</script><a href="javascript:bad()">x</a>' })
  assert.ok(out.includes('Natalie'))
  assert.ok(out.includes('href="https://x.test"'))
  assert.ok(!out.includes('onclick') && !out.includes('<script') && !out.includes('javascript:'))
})

test('a signature saved before columns existed reads as one column of text', () => {
  assert.deepEqual(signoffColumns({ ...base, text: 'Hello' }), { columns: 1, format: 'text', left: 'Hello', right: '' })
  assert.equal(signoffColumns({ ...base, columns: 2, text: 'a', textRight: 'b' }).right, 'b')
  assert.equal(signoffColumns({ ...base, columns: 1, text: 'a', textRight: 'stale' }).right, '')
})

test('the list summary reads the words, not the markup', () => {
  assert.equal(signoffSummary({ ...base, format: 'code', columns: 2, text: '<b>Natalie</b><br>MD', textRight: '<a href="#">site</a>' }), 'Natalie MD | site')
  assert.equal(signoffSummary({ ...base, text: '**Hi**\nthere' }), 'Hi there')
})
