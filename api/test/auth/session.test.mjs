import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { createPool, withoutTenant } from '../../src/db.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { resetSchema, seedTeam } from '../helpers/db.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
const TEAM = '11111111-1111-1111-1111-111111111111'
let app, entra, config, pool

before(async () => {
  config = loadConfig(testEnv())
  pool = createPool(config)
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  app = await buildApp(config, { metadata: entra.metadata, pool })
})
after(async () => { await app.close(); await entra.stop(); await pool.end() })
beforeEach(async () => { await resetSchema(pool); await seedTeam(pool, TEAM, 'Marketing') })

async function signIn() {
  const login = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(login.headers.location)
  entra.setTokenResponse({ status: 200,
    body: { id_token: await entra.mintIdToken({ nonce: url.searchParams.get('nonce') }) } })
  const cb = await app.inject({
    method: 'GET', url: `/auth/callback?code=abc&state=${url.searchParams.get('state')}`,
    cookies: { ni_auth: login.cookies.find((c) => c.name === 'ni_auth').value },
  })
  return cb.cookies.find((c) => c.name === 'ni_session').value
}

test('me returns the signed-in user', async () => {
  const session = await signIn()
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().email, 'tester@ninetyone.com')
  assert.equal(res.json().role, 'requester')
  assert.equal(res.json().teamId, TEAM)
})

test('me without a cookie is 401', async () => {
  const res = await app.inject({ method: 'GET', url: '/auth/me' })
  assert.equal(res.statusCode, 401)
})

test('a tampered session cookie is 401', async () => {
  const session = await signIn()
  const res = await app.inject({ method: 'GET', url: '/auth/me',
    cookies: { ni_session: session.slice(0, -4) + 'aaaa' } })
  assert.equal(res.statusCode, 401)
})

test('a revoked session stops working immediately', async () => {
  const session = await signIn()
  await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('an expired session is 401', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) =>
    c.query(`update sessions set expires_at = now() - interval '1 minute'`))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('removing the profile invalidates the session', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) => c.query('delete from profiles'))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.statusCode, 401)
})

test('a role change takes effect on the next request without re-signing in', async () => {
  const session = await signIn()
  await withoutTenant(pool, (c) => c.query(`update profiles set role = 'admin'`))
  const res = await app.inject({ method: 'GET', url: '/auth/me', cookies: { ni_session: session } })
  assert.equal(res.json().role, 'admin')
})

test('logout is idempotent', async () => {
  const session = await signIn()
  const first = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  assert.equal(first.statusCode, 204)
  const second = await app.inject({ method: 'POST', url: '/auth/logout', cookies: { ni_session: session } })
  assert.equal(second.statusCode, 204)
})
