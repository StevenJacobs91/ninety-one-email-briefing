import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.mjs'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'

test('healthz reports ok without touching the database', async () => {
  const app = await buildApp(loadConfig(testEnv()), { pool: null })
  const res = await app.inject({ method: 'GET', url: '/healthz' })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { status: 'ok' })
  await app.close()
})
