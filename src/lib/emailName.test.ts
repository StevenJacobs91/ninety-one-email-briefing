import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmailName, abbreviateRegion } from './emailName.ts'

test('South Africa is shortened to SA in the email name', () => {
  assert.match(buildEmailName('Women and Investing Newsletter', ['South Africa'], ['Individual Investor'], 'October Edition'),
    /^\d{4} SA Individual Investor Women and Investing Newsletter - October Edition$/)
})

test('SA is used for each region that is South Africa, and the others stay in full', () => {
  assert.match(buildEmailName('Update', ['South Africa', 'United Kingdom'], ['Advisor']), /^\d{4} SA-United Kingdom Advisor Update$/)
})

test('a region that only starts with the same words is not shortened', () => {
  assert.equal(abbreviateRegion('Southern Africa'), 'Southern Africa')
  assert.equal(abbreviateRegion('South Africa (ZA)'), 'South Africa (ZA)')
})

test('the match ignores case and surrounding spaces', () => {
  assert.equal(abbreviateRegion('south africa'), 'SA')
  assert.equal(abbreviateRegion('  South Africa '), 'SA')
})

test('the rest of the email name is unchanged', () => {
  assert.match(buildEmailName('', [], []), /^\d{4} TBD TBD Untitled$/)
  assert.match(buildEmailName('Q3', ['UK'], ['Retail'], '  '), /^\d{4} UK Retail Q3$/)
})
