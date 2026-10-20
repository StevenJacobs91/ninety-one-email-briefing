import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseModuleDom, moduleHtml, parseRegions, applyRegions, sanitizeRich } from './regions.ts'
import { parse, readModule } from './fixtures.ts'

const dom = (name: string) => parseModuleDom(readModule(name), parse)

test('Greeting exposes its paragraph regions as rich text', () => {
  const fields = parseRegions(dom('Greeting'))
  assert.equal(fields.length, 2)
  assert.ok(fields.every((f) => f.kind === 'rich'))
  assert.match(fields[0].value, /\{\{#if Recipient\.FirstName\}\}/)
})

test('Body Content exposes one rich text region', () => {
  const fields = parseRegions(dom('Body Content'))
  assert.equal(fields.length, 1)
  assert.equal(fields[0].kind, 'rich')
  assert.equal(fields[0].key, 'root.0')
})

test('a paragraph edit changes only that region and survives a round trip', () => {
  const d = dom('Body Content')
  const before = moduleHtml(d)
  const original = parseRegions(d)[0].value
  applyRegions(d, { 'root.0': { value: '<b>New</b> copy' } })
  const after = moduleHtml(d)
  assert.ok(after.includes('<b>New</b> copy'))
  assert.equal(after.replace('<b>New</b> copy', original), before)
})

test('Single Primary CTA exposes a button, not the wrapping detail region', () => {
  const fields = parseRegions(dom('Single Primary CTA'))
  assert.equal(fields.length, 1)
  assert.equal(fields[0].kind, 'button')
  assert.ok(fields[0].href !== undefined)
})

test('a button edit changes the label and href only', () => {
  const d = dom('Single Primary CTA')
  const before = moduleHtml(d)
  const f = parseRegions(d)[0]
  applyRegions(d, { [f.key]: { value: 'Read the report', href: 'https://example.com/r' } })
  const after = moduleHtml(d)
  assert.ok(after.includes('Read the report'))
  assert.ok(after.includes('href="https://example.com/r"'))
  assert.ok(after.length < before.length + 200)
})

test('Header with Image exposes headline and sub-headline text regions', () => {
  const fields = parseRegions(dom('Header with Image'))
  assert.deepEqual(fields.map((f) => f.kind), ['text', 'text'])
})

test('a text region that wraps a link keeps the link and its icon', () => {
  const d = dom('Article List')
  const link = parseRegions(d).find((f) => f.href !== undefined)
  assert.ok(link, 'Article List should have a link-bearing region')
  applyRegions(d, { [link!.key]: { value: 'Find out more' } })
  const html = moduleHtml(d)
  assert.ok(html.includes('Find out more'))
  assert.ok(html.includes('icon_web_link'))
})

test('plain text input is escaped', () => {
  const d = dom('Header with Image')
  const f = parseRegions(d)[0]
  applyRegions(d, { [f.key]: { value: 'a < b & "c"' } })
  assert.ok(moduleHtml(d).includes('a &lt; b &amp; "c"'))
})

test('sanitizeRich removes scripts, handlers and javascript links but keeps formatting', () => {
  const out = sanitizeRich('<b>ok</b><script>alert(1)</script><a href="javascript:x()" onclick="y()">l</a><em>e</em>')
  assert.ok(!/script|onclick|javascript:/i.test(out))
  assert.ok(out.includes('<b>ok</b>') && out.includes('<em>e</em>'))
})

test('an editable-image region exposes src and alt and applies both', () => {
  const d = dom('3x Speakers')
  const img = parseRegions(d).find((f) => f.kind === 'image')
  assert.ok(img)
  applyRegions(d, { [img!.key]: { value: 'https://cdn.example.com/a.jpg', alt: 'A speaker' } })
  const html = moduleHtml(d)
  assert.ok(html.includes('src="https://cdn.example.com/a.jpg"'))
  assert.ok(html.includes('alt="A speaker"'))
})

test('a module with no editable region parses to no fields', () => {
  assert.deepEqual(parseRegions(dom('Gallery V1')), [])
})

test('the preheader div module parses without losing its markup', () => {
  const d = dom('Visually Hidden Preheader Text')
  assert.ok(moduleHtml(d).includes('display:none'))
})
