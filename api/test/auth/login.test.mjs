import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { createVerifier, challengeFor } from '../../src/auth/pkce.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'

async function appWithFakeEntra() {
  const config = loadConfig(testEnv())
  const entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  const app = await buildApp(config, { metadata: entra.metadata, pool: null })
  return { app, entra, config }
}

test('login redirects to Entra with PKCE and a state parameter', async () => {
  const { app, entra } = await appWithFakeEntra()
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  assert.equal(res.statusCode, 302)
  const target = new URL(res.headers.location)
  assert.equal(target.origin + target.pathname, entra.metadata.authorization_endpoint)
  assert.equal(target.searchParams.get('response_type'), 'code')
  assert.equal(target.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(target.searchParams.get('code_challenge'))
  assert.ok(target.searchParams.get('state'))
  assert.ok(target.searchParams.get('nonce'))
  assert.match(target.searchParams.get('scope'), /openid/)
  await app.close(); await entra.stop()
})

test('login sets a signed, httpOnly, short-lived auth cookie', async () => {
  const { app, entra } = await appWithFakeEntra()
  const res = await app.inject({ method: 'GET', url: '/auth/login' })
  const cookie = res.cookies.find((c) => c.name === 'ni_auth')
  assert.ok(cookie, 'ni_auth cookie not set')
  assert.equal(cookie.httpOnly, true)
  assert.equal(cookie.sameSite, 'Lax')
  assert.ok(cookie.maxAge <= 600, 'auth cookie should be short-lived')
  await app.close(); await entra.stop()
})

test('two sign-ins get different state', async () => {
  const { app, entra } = await appWithFakeEntra()
  const a = await app.inject({ method: 'GET', url: '/auth/login' })
  const b = await app.inject({ method: 'GET', url: '/auth/login' })
  assert.notEqual(
    new URL(a.headers.location).searchParams.get('state'),
    new URL(b.headers.location).searchParams.get('state'))
  await app.close(); await entra.stop()
})

test('the challenge is the S256 hash of the verifier', async () => {
  const v = createVerifier()
  assert.equal(await challengeFor(v), createHash('sha256').update(v).digest('base64url'))
})
