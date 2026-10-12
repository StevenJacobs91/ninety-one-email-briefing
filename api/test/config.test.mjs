import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'

test('a complete environment loads', () => {
  const c = loadConfig(testEnv({ PORT: '8080' }))
  assert.equal(c.port, 8080)
  assert.equal(c.entra.clientId, 'test-client')
  assert.equal(c.sessionTtlSeconds, 3600)
})

test('every missing variable is reported at once, not just the first', () => {
  const { ENTRA_CLIENT_ID, PGHOST, ...rest } = testEnv()
  assert.throws(() => loadConfig(rest), (e) =>
    /ENTRA_CLIENT_ID/.test(e.message) && /PGHOST/.test(e.message))
})

test('a short cookie secret is rejected', () => {
  assert.throws(() => loadConfig(testEnv({ SESSION_COOKIE_SECRET: 'short' })),
    /SESSION_COOKIE_SECRET/)
})

test('the config never stringifies its secrets', () => {
  const c = loadConfig(testEnv())
  const dumped = JSON.stringify(c)
  assert.ok(!dumped.includes('test-client-secret'), 'client secret leaked into JSON')
  assert.ok(!dumped.includes('test-secret-at-least'), 'cookie secret leaked into JSON')
  assert.ok(!dumped.includes('localdev'), 'database password leaked into JSON')
})
