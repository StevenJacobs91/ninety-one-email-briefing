import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'
const TEMP = '33333333-3333-3333-3333-333333333333'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Tester')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('a session is created with an expiry and no revocation', async () => {
  const { rows } = await c.query(
    `insert into sessions (profile_id, team_id, expires_at)
     values ($1, $2, now() + interval '8 hours') returning id, revoked_at`, [USER, TEAM])
  assert.ok(rows[0].id)
  assert.equal(rows[0].revoked_at, null)
})

test('removing a profile removes its sessions', async () => {
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Temp')`, [TEMP, TEAM])
  await c.query(`insert into sessions (profile_id, team_id, expires_at)
                 values ($1, $2, now() + interval '1 hour')`, [TEMP, TEAM])
  await c.query('delete from profiles where id = $1', [TEMP])
  const { rows } = await c.query('select count(*)::int n from sessions where profile_id = $1', [TEMP])
  assert.equal(rows[0].n, 0)
})

test('sessions is covered by the tenant policy like every other table', async () => {
  const { rows } = await c.query(
    `select relrowsecurity, relforcerowsecurity from pg_class where oid='public.sessions'::regclass`)
  assert.equal(rows[0].relrowsecurity, true)
  assert.equal(rows[0].relforcerowsecurity, true)
  const { rows: p } = await c.query(
    `select policyname from pg_policies where schemaname='public' and tablename='sessions'`)
  assert.deepEqual(p.map((r) => r.policyname), ['sessions_tenant'])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
