import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixThemeBlock } from './themeBlock.ts'

const BLOCK = (p: string, t1: string, t2: string, t3: string, a: string) => `<!-- Theming Options Start -->
<style>
.primary-color {
    background-color: ${p} !important;
    bgcolor: ${p} !important;
    color: ${p} !important;
}
.tint-01-color {
    background-color: ${t1};
    bgcolor: ${t1};
    color: ${t1};
}
.tint-02-color {
    background-color: ${t2};
    bgcolor: ${t2};
    color: ${t2};
}
.tint-03-color {
    background-color: ${t3};
    bgcolor: ${t3};
    color: ${t3};
}
.accent-color {
    color: ${a} !important;
}
</style>
<!-- Theming Options End -->`

test('a theme block carrying another theme\'s colours is rewritten to the theme\'s own brand colours', () => {
  // Warm Yellowwood\'s master had Pinotage Burgundy pasted in.
  const wrong = BLOCK('#591739', '#652043', '#511536', '#3C0E2E', '#FCAA28')
  const out = fixThemeBlock(`<head>${wrong}</head>`, '#134848', '#FCAA28')
  assert.equal(out, `<head>${BLOCK('#134848', '#1D4F4F', '#114141', '#0D3232', '#FCAA28')}</head>`)
})

test('a block that is already right is unchanged', () => {
  const right = BLOCK('#134848', '#1D4F4F', '#114141', '#0D3232', '#FBAA96')
  assert.equal(fixThemeBlock(right, '#134848', '#FBAA96'), right)
})

test('the accent follows the theme', () => {
  const out = fixThemeBlock(BLOCK('#221B3B', '#292047', '#1E1834', '#181329', '#000000'), '#221b3b', '#009d80')
  assert.match(out, /\.accent-color \{\s*color: #009D80 !important;/)
})

test('markup with no theme block, or a primary outside the brand, is left alone', () => {
  assert.equal(fixThemeBlock('<p>nothing</p>', '#134848', '#fbaa96'), '<p>nothing</p>')
  const custom = BLOCK('#123456', '#111111', '#222222', '#333333', '#444444')
  assert.equal(fixThemeBlock(custom, '#123456', '#444444'), custom)
})
