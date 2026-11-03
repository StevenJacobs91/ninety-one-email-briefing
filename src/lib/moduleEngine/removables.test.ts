import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeModule } from './describe.ts'
import { renderBuild } from './render.ts'
import { newModule, type EmailBuild } from './build.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

// A module whose button row is a section the person can remove, as in the library's CTA modules.
const CTA = `<tr><td><p pardot-region="paragraph">Intro text</p></td></tr>
<tr pardot-removable="button"><td><table><tbody><tr>
  <td class="button-copy"><a pardot-region="button" href="https://x.test/go">Go there</a></td>
  <td><p pardot-region="detail">Small print</p></td>
</tr></tbody></table></td></tr>`

const info = (html: string) => describeModule('CTA module', html, parse)

function render(html: string, regions: EmailBuild['modules'][number]['regions']): { html: string; dropped: number } {
  const cat: ThemeCatalogue = { themeId: 'agulhas-coral', shell: { head: '', tail: '' }, order: ['M'], modules: { M: html } }
  const m = { ...newModule('M'), regions }
  const out = renderBuild({ version: 1, themeId: 'agulhas-coral', modules: [m] }, cat, { parse })
  return { html: out.html, dropped: out.report.droppedKeys.length }
}

test('a section marked pardot-removable is listed, named for what it is, and its fields say which section they are in', () => {
  const i = info(CTA)
  assert.deepEqual(i.removables?.map((r) => [r.key, r.name, r.label]), [['root.rm.button.0', 'button', 'Button']])
  assert.deepEqual(i.fields.filter((f) => f.removable === 'root.rm.button.0').map((f) => f.rawKind), ['button', 'detail'])
  assert.equal(i.fields.find((f) => f.rawKind === 'paragraph')!.removable, undefined, 'the intro is not in it')
})

test('removing a section takes it out of the email and nothing else', () => {
  const { html, dropped } = render(CTA, { 'root.rm.button.0': { removed: true } })
  assert.ok(html.includes('Intro text'))
  assert.ok(!html.includes('Go there') && !html.includes('Small print'))
  assert.equal(dropped, 0, 'the removal is not reported as a lost edit')
})

test('a section that is restored comes back, and a module nobody removed anything from is unchanged', () => {
  assert.ok(render(CTA, { 'root.rm.button.0': { removed: false } }).html.includes('Go there'))
  assert.ok(render(CTA, {}).html.includes('Go there'))
})

test('what was typed in a section that is then removed is kept: restoring it brings the edit back', () => {
  const key = info(CTA).fields.find((f) => f.rawKind === 'button')!.key
  const edited = { [key]: { value: 'Book now' } }
  assert.ok(!render(CTA, { ...edited, 'root.rm.button.0': { removed: true } }).html.includes('Book now'))
  assert.ok(render(CTA, { ...edited, 'root.rm.button.0': { removed: false } }).html.includes('Book now'))
})

test('the same section name twice is two sections, numbered in turn', () => {
  const two = `${CTA}\n<tr pardot-removable="button"><td><a pardot-region="button" href="https://x.test/b">Second</a></td></tr>`
  assert.deepEqual(info(two).removables?.map((r) => r.key), ['root.rm.button.0', 'root.rm.button.1'])
  const { html } = render(two, { 'root.rm.button.1': { removed: true } })
  assert.ok(html.includes('Go there') && !html.includes('Second'))
})

test('a section inside a repeating unit belongs to that unit', () => {
  const unit = (n: number) => `<tr pardot-repeatable="item"><td>
    <h3 pardot-region="heading">Heading ${n}</h3>
    <p pardot-removable="note" pardot-region="detail">Note ${n}</p>
  </td></tr>`
  const two = `${unit(1)}\n${unit(2)}`
  const i = info(two)
  assert.deepEqual(i.removables?.map((r) => r.key), ['item[0].rm.note.0', 'item[1].rm.note.0'])
  assert.deepEqual(i.removables?.map((r) => r.unit?.index), [0, 1])
  const { html } = render(two, { 'item[1].rm.note.0': { removed: true } })
  assert.ok(html.includes('Note 1') && !html.includes('Note 2'))
})

test('a section that is itself a region carries its own field', () => {
  const i = info(`<tr><td><p pardot-region="detail" pardot-removable="detail">Only me</p></td></tr>`)
  assert.deepEqual(i.fields.map((f) => f.removable), ['root.rm.detail.0'])
})

test('Pardot\'s own marker stays in the email on a section that is kept', () => {
  assert.ok(render(CTA, {}).html.includes('pardot-removable="button"'))
})
