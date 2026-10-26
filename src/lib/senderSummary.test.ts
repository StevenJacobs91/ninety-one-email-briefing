import { test } from 'node:test'
import assert from 'node:assert/strict'
import { senderLine, senderRows } from './senderSummary.ts'

const general = { senderType: 'general' as const, fromName: 'Ninety One Taking Stock', fromAddress: 'takingstock@ninetyone.com', specificUser: '' }

test('a general user send shows the from name and address', () => {
  assert.deepEqual(senderRows(general), [['From Name', 'Ninety One Taking Stock'], ['From Address', 'takingstock@ninetyone.com']])
  assert.equal(senderLine(general), 'Ninety One Taking Stock <takingstock@ninetyone.com>')
})

test('a brief saved before sender types existed reads as a general user send', () => {
  const legacy = { fromName: 'Ninety One', fromAddress: 'a@ninetyone.com' }
  assert.deepEqual(senderRows(legacy), [['From Name', 'Ninety One'], ['From Address', 'a@ninetyone.com']])
})

test('a specific user send shows the user, not a from name or address', () => {
  const specific = { ...general, senderType: 'specific' as const, specificUser: '12345' }
  assert.deepEqual(senderRows(specific), [['Sender', 'Specific user'], ['Pardot User ID', '12345']])
  assert.equal(senderLine(specific), 'Specific user (Pardot user 12345)')
})

test('an assigned user send says so, and shows no from name or address', () => {
  const assigned = { ...general, senderType: 'assigned' as const }
  assert.deepEqual(senderRows(assigned), [['Sender', "Assigned user (the prospect's own Pardot user)"]])
  assert.equal(senderLine(assigned), "Assigned user (the prospect's own Pardot user)")
})
