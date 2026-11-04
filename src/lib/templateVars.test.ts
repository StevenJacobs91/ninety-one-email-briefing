import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fillMonth, monthName } from './templateVars.ts'

test('{{month}} becomes the month name, however it is spaced or cased', () => {
  assert.equal(fillMonth('Assistant Impact – {{month}} edition | Ninety One', 'November'), 'Assistant Impact – November edition | Ninety One')
  assert.equal(fillMonth('{{ Month }} and {{MONTH}}', 'May'), 'May and May')
})

test('text with no {{month}} is returned as it was, and other braces are left alone', () => {
  assert.equal(fillMonth('Taking Stock', 'May'), 'Taking Stock')
  assert.equal(fillMonth('{{#if Recipient.FirstName}}Hi{{/if}}', 'May'), '{{#if Recipient.FirstName}}Hi{{/if}}')
})

test('the month is the send date\'s when there is one, else the current month', () => {
  const now = new Date(2026, 10, 3)
  assert.equal(monthName('2026-12-15', now), 'December')
  assert.equal(monthName('', now), 'November')
  assert.equal(monthName(undefined, now), 'November')
  assert.equal(monthName('not a date', now), 'November')
})
