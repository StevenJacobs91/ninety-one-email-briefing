import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nonHexColours, rgbToHex } from './hexColours.ts'

test('opaque rgb colours become lowercase hex, however they are spaced', () => {
  assert.equal(rgbToHex('color: rgb(232, 229, 206);'), 'color: #e8e5ce;')
  assert.equal(rgbToHex('color: rgb(232, 229, 207);'), 'color: #e8e5ce;', 'the supplied library\'s near-miss of Springbok Cream is the brand cream')
  assert.equal(rgbToHex('color:rgb(0,0,0)'), 'color:#000000')
  assert.equal(rgbToHex('background: RGB( 251 , 170 , 150 )'), 'background: #fbaa96')
  assert.equal(rgbToHex('color: rgb(0 157 128)'), 'color: #009d80')
})

test('rgba with full opacity becomes hex, and a colour with real transparency is left alone', () => {
  assert.equal(rgbToHex('rgba(19, 72, 72, 1)'), '#134848')
  assert.equal(rgbToHex('rgba(19, 72, 72, 100%)'), '#134848')
  assert.equal(rgbToHex('rgba(19, 72, 72, 0.5)'), 'rgba(19, 72, 72, 0.5)')
  assert.equal(rgbToHex('rgb(0 0 0 / 40%)'), 'rgb(0 0 0 / 40%)')
})

test('every colour in a style attribute is converted, and nothing else is touched', () => {
  const html = '<td style="color: rgb(0, 0, 0); border-color: rgb(10, 20, 30); padding: 10px" bgcolor="#134848">rgb is a word</td>'
  assert.equal(rgbToHex(html), '<td style="color: #000000; border-color: #0a141e; padding: 10px" bgcolor="#134848">rgb is a word</td>')
  assert.equal(rgbToHex('rgb(300, 0, 0)'), 'rgb(300, 0, 0)')
})

test('what is still not hex can be listed', () => {
  assert.deepEqual(nonHexColours('a rgba(0,0,0,.5) b hsl(10, 20%, 30%) c #fff'), ['rgba(0,0,0,.5)', 'hsl(10, 20%, 30%)'])
  assert.deepEqual(nonHexColours('color: #134848'), [])
})
