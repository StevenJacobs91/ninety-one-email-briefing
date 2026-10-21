import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND_FONT_FILES, selfHostFonts } from './previewFonts.ts'

const PARDOT = 'https://weare.ninetyone.com/l/28902/2020-10-19/8zs4jq/28902/1603114661MAzRiC9E'
const face = (family: string, url: string, q = '"') => `@font-face { font-family: ${q}${family}${q}; src: url(${q}${url}${q}); }`

test('each brand font file on the Pardot host is pointed at the app\'s own copy for previews', () => {
  const files: [string, string][] = [
    ['Ninety One Visuelt Light', 'NinetyOneVisuelt_Light.woff'],
    ['Ninety One Visuelt Medium', 'NinetyOneVisuelt_Medium.woff'],
    ['Ninety One Visuelt Display', 'NinetyOneVisueltDisplay_Regular.woff'],
    ['Ninety One Visuelt', 'NinetyOneVisuelt_Regular.woff'],
  ]
  for (const [family, file] of files) {
    assert.equal(
      selfHostFonts(face(family, `${PARDOT}/${file}`), 'http://localhost:5173'),
      face(family, `http://localhost:5173/fonts/${file}`),
      file,
    )
  }
})

test('single quotes, no quotes and repeats are all handled, and a trailing slash on the origin is ignored', () => {
  const html = `${face('A', `${PARDOT}/NinetyOneVisuelt_Light.woff`, "'")}\n@font-face { src: url(${PARDOT}/NinetyOneVisuelt_Light.woff); }`
  const out = selfHostFonts(html, 'https://app.example.com/')
  assert.equal([...out.matchAll(/https:\/\/app\.example\.com\/fonts\/NinetyOneVisuelt_Light\.woff/g)].length, 2)
  assert.ok(!out.includes('weare.ninetyone.com'))
})

test('images and links on the same host, and fonts that are not the brand\'s, are left alone', () => {
  const html = '<img src="https://weare.ninetyone.com/l/28902/x/91_logo.png"><a href="https://weare.ninetyone.com/p">x</a>' + face('Other', 'https://fonts.example.com/Other.woff')
  assert.equal(selfHostFonts(html, 'http://localhost:5173'), html)
})

test('rewriting twice changes nothing more', () => {
  const once = selfHostFonts(face('L', `${PARDOT}/NinetyOneVisuelt_Light.woff`), 'http://localhost:5173')
  assert.equal(selfHostFonts(once, 'http://localhost:5173'), once)
})

test('every brand font file the previews point at is actually in the app\'s /fonts folder, as a real WOFF', () => {
  for (const file of BRAND_FONT_FILES) {
    const path = join(process.cwd(), 'public', 'fonts', file)
    assert.ok(existsSync(path), `${file} is missing from public/fonts (run npm run fonts:fetch)`)
    assert.equal(readFileSync(path).subarray(0, 4).toString('ascii'), 'wOFF', file)
  }
})
