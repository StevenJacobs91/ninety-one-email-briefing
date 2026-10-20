import { test } from 'node:test'
import assert from 'node:assert/strict'
import { functionErrorMessage, functionErrorDetails, isFunctionMissing } from './functionError.ts'

const httpError = (status: number, body: string) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: new Response(body, { status }),
})

test('the function’s own error message is used instead of the generic one', async () => {
  const msg = await functionErrorMessage(httpError(400, JSON.stringify({ error: 'A user with this email address has already been registered' })), 'fallback')
  assert.equal(msg, 'A user with this email address has already been registered')
})

test('a non-JSON error body falls back to the error message', async () => {
  const msg = await functionErrorMessage(httpError(500, 'boom'), 'fallback')
  assert.equal(msg, 'Edge Function returned a non-2xx status code')
})

test('a plain error uses its message and nothing at all uses the fallback', async () => {
  assert.equal(await functionErrorMessage(new Error('network down'), 'fallback'), 'network down')
  assert.equal(await functionErrorMessage(undefined, 'fallback'), 'fallback')
})

test('a missing function is recognised by its 404', () => {
  assert.equal(isFunctionMissing(httpError(404, 'Not found')), true)
  assert.equal(isFunctionMissing(httpError(400, '{}')), false)
  assert.equal(isFunctionMissing(new Error('x')), false)
})

test('the error code the function returned is available alongside the message', async () => {
  const d = await functionErrorDetails(httpError(409, JSON.stringify({ error: 'Removed user', code: 'REMOVED_USER' })), 'fallback')
  assert.deepEqual(d, { message: 'Removed user', code: 'REMOVED_USER' })
})

test('without a code the details carry only the message', async () => {
  assert.deepEqual(await functionErrorDetails(new Error('x'), 'fallback'), { message: 'x', code: undefined })
})
