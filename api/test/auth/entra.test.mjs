import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import * as jose from 'jose'
import { verifyIdToken, exchangeCode } from '../../src/auth/entra.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
let entra, config

before(async () => {
  config = loadConfig(testEnv())
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
})
after(async () => { await entra.stop() })

test('a correctly signed token yields the Entra object id and email', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' })
  const claims = await verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' })
  assert.equal(claims.oid, '99999999-9999-9999-9999-999999999999')
  assert.equal(claims.email, 'tester@ninetyone.com')
  assert.equal(claims.name, 'Test User')
})

test('a token for another audience is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { audience: 'someone-else' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }),
    (e) => e instanceof jose.errors.JWTClaimValidationFailed)
})

test('a token from another issuer is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { issuer: 'https://evil.example/v2.0' })
  await assert.rejects(verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }))
})

test('an expired token is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' }, { exp: '-1m' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }),
    (e) => e instanceof jose.errors.JWTExpired)
})

test('a replayed token with the wrong nonce is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'different' }), /nonce/)
})

test('a token with no oid claim is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1', oid: undefined })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }), /oid|missing/)
})

test('a token from a different Entra tenant is rejected', async () => {
  const token = await entra.mintIdToken({ nonce: 'n1', tid: 'another-tenant' })
  await assert.rejects(
    verifyIdToken(token, { config, metadata: entra.metadata, nonce: 'n1' }), /tenant/)
})

test('a token endpoint error surfaces without leaking the client secret', async () => {
  entra.setTokenResponse({ status: 400, body: { error: 'invalid_grant' } })
  await assert.rejects(
    exchangeCode({ config, metadata: entra.metadata, code: 'c', codeVerifier: 'v' }),
    (e) => /invalid_grant/.test(e.message) && !e.message.includes(config.entra.clientSecret))
})
