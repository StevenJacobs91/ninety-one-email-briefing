import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { buildApp } from '../../src/app.mjs'
import { loadConfig } from '../../src/config.mjs'
import { createPool, withTenant } from '../../src/db.mjs'
import { exchangeCode } from '../../src/auth/entra.mjs'
import { testEnv } from '../helpers/env.mjs'
import { startFakeEntra } from '../helpers/fake-entra.mjs'
import { resetSchema, seedTeam, asOwner } from '../helpers/db.mjs'

const ISSUER = 'https://login.microsoftonline.com/test-tenant/v2.0'
const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'
const SRC = fileURLToPath(new URL('../../src/', import.meta.url))
let app, entra, config, pool

before(async () => {
  config = loadConfig(testEnv())
  pool = createPool(config)
  entra = await startFakeEntra({ issuer: ISSUER, audience: config.entra.clientId })
  app = await buildApp(config, { metadata: entra.metadata, pool })
})
after(async () => { await app.close(); await entra.stop(); await pool.end() })
beforeEach(async () => { await resetSchema(pool); await seedTeam(pool, A, 'Team A') })

async function sourceFiles(dir = SRC, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) await sourceFiles(p, acc)
    else if (e.name.endsWith('.mjs')) acc.push(p)
  }
  return acc
}

// ---- C1: the role cannot be escaped or left unrestored ---------------------
test('C1 no source file issues reset role', async () => {
  const offenders = []
  for (const f of await sourceFiles()) {
    if (/reset\s+role/i.test(await readFile(f, 'utf8'))) offenders.push(f.replace(SRC, ''))
  }
  assert.deepEqual(offenders, [], 'reset role is a fail-open escalation path')
})

test('C1 every pooled connection runs as app_user, including the first query', async () => {
  const p = createPool(loadConfig(testEnv()))
  try {
    const { rows } = await p.query('select current_user')
    assert.equal(rows[0].current_user, 'app_user')
  } finally { await p.end() }
})

test('C1 the privileged lookups do not leave the connection escalated', async () => {
  const { resolveSession } = await import('../../src/auth/sessions.mjs')
  await resolveSession(pool, '00000000-0000-0000-0000-000000000000')
  const { rows } = await pool.query('select current_user')
  assert.equal(rows[0].current_user, 'app_user')
})

// ---- C2: the privileged path does not depend on being a superuser ---------
test('C2 the pre-tenant lookups are SECURITY DEFINER functions', async () => {
  const { rows } = await asOwner(pool, (c) => c.query(`
    select proname, prosecdef from pg_proc
     where pronamespace='public'::regnamespace
       and proname in ('lookup_session','upsert_profile') order by 1`))
  assert.deepEqual(rows.map((r) => r.proname), ['lookup_session', 'upsert_profile'])
  assert.ok(rows.every((r) => r.prosecdef), 'both must be SECURITY DEFINER')
})

test('C2 profiles and sessions do not FORCE RLS, so the definer is unconstrained', async () => {
  const { rows } = await asOwner(pool, (c) => c.query(`
    select relname, relforcerowsecurity from pg_class
     where oid in ('public.profiles'::regclass,'public.sessions'::regclass) order by 1`))
  assert.deepEqual(rows.map((r) => [r.relname, r.relforcerowsecurity]),
    [['profiles', false], ['sessions', false]])
})

// ---- I1: database errors must not reach the client ------------------------
test('I1 a database error is not reflected to an unauthenticated caller', async () => {
  const login = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(login.headers.location)
  entra.setTokenResponse({ status: 200,
    body: { id_token: await entra.mintIdToken({ nonce: url.searchParams.get('nonce') }) } })
  const res = await app.inject({
    method: 'GET', url: `/auth/callback?code=abc&state=${url.searchParams.get('state')}`,
    cookies: { ni_auth: login.cookies.find((c) => c.name === 'ni_auth').value },
    headers: { 'x-forwarded-for': 'not-an-ip' },
  })
  assert.ok(res.statusCode < 500, `expected no 5xx, got ${res.statusCode}: ${res.body}`)
  assert.ok(!/invalid input syntax|22P02|inet/i.test(res.body),
    `database internals leaked: ${res.body}`)
})

// ---- I2: a spoofed forwarded-for must not become audit data ---------------
test('I2 an unroutable forwarded-for is not stored as the session ip', async () => {
  const login = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(login.headers.location)
  entra.setTokenResponse({ status: 200,
    body: { id_token: await entra.mintIdToken({ nonce: url.searchParams.get('nonce') }) } })
  await app.inject({
    method: 'GET', url: `/auth/callback?code=abc&state=${url.searchParams.get('state')}`,
    cookies: { ni_auth: login.cookies.find((c) => c.name === 'ni_auth').value },
    headers: { 'x-forwarded-for': 'not-an-ip' },
  })
  const { rows } = await asOwner(pool, (c) => c.query('select ip from sessions'))
  assert.ok(rows.every((r) => r.ip === null || /^[0-9a-f.:]+/i.test(String(r.ip))),
    `a non-ip was stored: ${JSON.stringify(rows)}`)
})

// ---- I3: an authorization code must be usable once ------------------------
test('I3 replaying the same callback does not mint a second session', async () => {
  const login = await app.inject({ method: 'GET', url: '/auth/login' })
  const url = new URL(login.headers.location)
  const cookie = login.cookies.find((c) => c.name === 'ni_auth').value
  const state = url.searchParams.get('state')
  const nonce = url.searchParams.get('nonce')

  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const first = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.equal(first.statusCode, 302)

  entra.setTokenResponse({ status: 200, body: { id_token: await entra.mintIdToken({ nonce }) } })
  const replay = await app.inject({ method: 'GET', url: `/auth/callback?code=abc&state=${state}`,
    cookies: { ni_auth: cookie } })
  assert.notEqual(replay.statusCode, 302, 'a replayed callback was accepted')

  const { rows } = await asOwner(pool, (c) => c.query('select count(*)::int n from sessions'))
  assert.equal(rows[0].n, 1, 'a replay minted a second session')
})

// ---- I5: an idle client error must not crash the process ------------------
test('I5 the pool has an error listener', () => {
  assert.ok(pool.listenerCount('error') > 0, 'an unhandled idle-client error exits the process')
})

// ---- I7: outbound Entra calls must be bounded -----------------------------
test('I7 a hanging token endpoint does not hang the request forever', async () => {
  const hang = createServer(() => { /* never responds */ })
  await new Promise((r) => hang.listen(0, '127.0.0.1', r))
  const metadata = { ...entra.metadata, token_endpoint: `http://127.0.0.1:${hang.address().port}/token` }
  try {
    const started = Date.now()
    await assert.rejects(exchangeCode({ config, metadata, code: 'c', codeVerifier: 'v' }))
    assert.ok(Date.now() - started < 15_000, 'the outbound call was not bounded by a timeout')
  } finally { await new Promise((r) => hang.close(r)) }
})

// ---- I6: the unauthenticated endpoints must be rate limited ---------------
test('I6 repeated sign-in attempts are throttled', async () => {
  const codes = []
  for (let i = 0; i < 40; i++) {
    codes.push((await app.inject({ method: 'GET', url: '/auth/login' })).statusCode)
  }
  assert.ok(codes.includes(429), `no request was throttled: ${[...new Set(codes)].join(',')}`)
})

// ---- tenant isolation still holds after all of the above ------------------
test('tenant isolation still holds', async () => {
  await seedTeam(pool, B, 'Team B')
  await asOwner(pool, (c) => c.query(
    `insert into kanban_cards (team_id, brief_id) values ($1, 'a-1'), ($2, 'b-1')`, [A, B]))
  const rows = await withTenant(pool, A, async (c) =>
    (await c.query('select brief_id from kanban_cards')).rows)
  assert.deepEqual(rows.map((r) => r.brief_id), ['a-1'])
})
