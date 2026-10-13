import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { createPool } from '../../src/db.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { resetSchema, seedTeam, asOwner } from '../helpers/db.mjs'

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

async function startLogin() {
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(res.headers.location)
  return {
    state: url.searchParams.get('state'),
    nonce: url.searchParams.get('nonce'),
    cookie: res.cookies.find((c) => c.name === 'ni_auth').value,
  }
}

test('a valid callback provisions a profile and sets a session cookie', async () => {
  const { state, nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })

  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })

  assert.equal(res.statusCode, 302)
  assert.equal(res.headers.location, config.appOrigin)
  const session = res.cookies.find((c) => c.name === 'ni_session')
  assert.ok(session)
  assert.equal(session.httpOnly, true)

  const rows = await asOwner(pool, async (c) =>
    (await c.query('select id, team_id, role from profiles')).rows)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, '99999999-9999-9999-9999-999999999999')
  assert.equal(rows[0].team_id, TEAM)
  assert.equal(rows[0].role, 'requester')
})

test('signing in twice does not create a second profile', async () => {
  for (let i = 0; i < 2; i++) {
    const { state, nonce, cookie } = await startLogin()
    entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
    await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
      cookies: { ni_auth: cookie } })
  }
  const rows = await asOwner(pool, async (c) =>
    (await c.query('select count(*)::int n from profiles')).rows)
  assert.equal(rows[0].n, 1)
})

test('an existing profile keeps its role; sign-in does not reset it to requester', async () => {
  const first = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: first.nonce }) } })
  await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${first.state}`,
    cookies: { ni_auth: first.cookie } })
  await asOwner(pool, (c) => c.query(`update profiles set role = 'admin'`))

  const second = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: second.nonce }) } })
  await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${second.state}`,
    cookies: { ni_auth: second.cookie } })

  const rows = await asOwner(pool, async (c) =>
    (await c.query('select role from profiles')).rows)
  assert.equal(rows[0].role, 'admin')
})

test('a mismatched state is rejected and creates no session', async () => {
  const { nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const res = await app.inject({ method: 'GET', url: '/auth/callback?code=abc&state=forged',
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 400)
  assert.ok(!res.cookies.some((c) => c.name === 'ni_session' && c.value))
})

test('a callback with no auth cookie is rejected', async () => {
  const res = await app.inject({ method: 'GET', url: '/auth/callback?code=abc&state=whatever' })
  assert.equal(res.statusCode, 400)
})

test('a token whose nonce does not match the sign-in is rejected', async () => {
  const { state, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce: 'other' }) } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 401)
})

test('the auth cookie is cleared after the callback so the code cannot be replayed', async () => {
  const { state, nonce, cookie } = await startLogin()
  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  const cleared = res.cookies.find((c) => c.name === 'ni_auth')
  assert.ok(cleared && (cleared.value === '' || cleared.maxAge === 0), 'ni_auth not cleared')
})

test('an error from Entra does not create a session', async () => {
  const { state, cookie } = await startLogin()
  entra.setTokenResponse({ status: 400, body: { error: 'invalid_grant' } })
  const res = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.equal(res.statusCode, 401)
  const rows = await asOwner(pool, async (c) =>
    (await c.query('select count(*)::int n from sessions')).rows)
  assert.equal(rows[0].n, 0)
})
