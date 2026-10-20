import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { whiten } from './whiten.ts'

const DIR = join(process.cwd(), 'Themes and Modules', 'Modules', 'Springbok Cream Protea Red')
const read = (n: string) => readFileSync(join(DIR, `${n}.html`), 'utf8')
const CREAM = /#(eeebda|dbd8c0|b3aa9c|e8e5ce)/i

test('background creams become white and light neutrals', () => {
  assert.equal(whiten('<td bgcolor="#EEEBDA">'), '<td bgcolor="#ffffff">')
  assert.equal(whiten('<td bgcolor="#dbd8c0">'), '<td bgcolor="#f4f4f4">')
  assert.equal(whiten('<td style="background-color:#e8e5ce">'), '<td style="background-color:#ffffff">')
})

test('the taupe is a light grey as a fill and a mid grey as text or border', () => {
  assert.equal(whiten('<td bgcolor="#b3aa9c">'), '<td bgcolor="#e4e5e6">')
  assert.equal(whiten('<p style="color:#b3aa9c">'), '<p style="color:#afafaf">')
})

test('cream button text becomes white, and accents, text grey and assets are untouched', () => {
  const html = '<a style="color:#E8E5CE;" href="https://weare.ninetyone.com/l/1/protea_red_header_logo_300x150.png"></a><p style="color:#424242;color:#D83949">'
  assert.equal(
    whiten(html),
    '<a style="color:#ffffff;" href="https://weare.ninetyone.com/l/1/protea_red_header_logo_300x150.png"></a><p style="color:#424242;color:#D83949">',
  )
})

test('no cream colour survives in any Springbok Cream module', () => {
  const names = readdirSync(DIR).filter((f) => f.endsWith('.html') && !f.endsWith(' 2.html'))
  assert.ok(names.length >= 48)
  for (const f of names) assert.ok(!CREAM.test(whiten(readFileSync(join(DIR, f), 'utf8'))), `${f} still has a cream colour`)
})

test('markup other than those colours is unchanged', () => {
  const html = read('Single Primary CTA')
  const out = whiten(html)
  assert.equal(out.replace(/#ffffff/g, '#E8E5CE'), html.replace(/#e8e5ce/gi, '#E8E5CE'))
})
