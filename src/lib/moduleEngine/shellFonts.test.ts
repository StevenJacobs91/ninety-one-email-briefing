import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DISPLAY_WOFF, fixShellFonts } from './shellFonts.ts'

const BROKEN = `@font-face {
    font-family: 'Ninety One Visuelt Display';
    src: local('Ninety One Visuelt Display'), local('Ninety-One-Visuelt-Display'), url('Ninety One Visuelt Display.ttf');
}
@font-face {
    font-family: "Ninety One Visuelt Display";
    src: url("${DISPLAY_WOFF}");
    font-weight: 200;
    font-style: normal;
}`

test('the normal-weight Display face gets the real font file instead of a relative file that does not exist', () => {
  const out = fixShellFonts(BROKEN)
  assert.ok(!out.includes('Ninety One Visuelt Display.ttf'))
  assert.match(out, /local\('Ninety-One-Visuelt-Display'\), url\("https:\/\/weare\.ninetyone\.com\/[^"]+NinetyOneVisueltDisplay_Regular\.woff"\);/)
})

test('installed copies are still preferred, and the other faces are untouched', () => {
  const out = fixShellFonts(BROKEN)
  assert.ok(out.includes("local('Ninety One Visuelt Display')"))
  assert.ok(out.includes('font-weight: 200;'))
})

test('fixing twice, or fixing a head that was already right, changes nothing more', () => {
  const once = fixShellFonts(BROKEN)
  assert.equal(fixShellFonts(once), once)
  assert.equal(fixShellFonts('<style>p { color: red }</style>'), '<style>p { color: red }</style>')
})
