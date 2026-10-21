import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getStepFields } from './validateStep.ts'

test('the Layout step validates no fields, so nothing blocks moving on', () => {
  assert.deepEqual(getStepFields('content'), [])
  assert.deepEqual(getStepFields(1), [])
})
