import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPool, withTenant } from '../../src/db.mjs'
import { loadConfig } from '../../src/config.mjs'
import { testEnv } from '../helpers/env.mjs'
import { resetSchema, seedTeam, asOwner } from '../helpers/db.mjs'

const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'
let pool

before(async () => { pool = createPool(loadConfig(testEnv())) })
after(async () => { await pool.end() })
beforeEach(async () => {
  await resetSchema(pool)
  await seedTeam(pool, A, 'Team A')
  await seedTeam(pool, B, 'Team B')
  await asOwner(pool, async (c) => {
    await c.query(`insert into profiles (id, team_id, display_name) values
      ('aaaaaaaa-0000-0000-0000-000000000001', $1, 'A'),
      ('bbbbbbbb-0000-0000-0000-000000000002', $2, 'B')`, [A, B])
    await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'a-1'), ($2, 'b-1')`, [A, B])
    await c.query('insert into settings (team_id) values ($1), ($2)', [A, B])
    await c.query(`insert into sessions (profile_id, team_id, expires_at) values
      ('aaaaaaaa-0000-0000-0000-000000000001', $1, now() + interval '1 hour'),
      ('bbbbbbbb-0000-0000-0000-000000000002', $2, now() + interval '1 hour')`, [A, B])
  })
})

test('no table is readable across tenants through the application path', async () => {
  for (const table of ['kanban_cards', 'settings', 'sessions', 'profiles']) {
    const rows = await withTenant(pool, A, async (c) =>
      (await c.query(`select team_id from ${table}`)).rows)
    assert.ok(rows.length > 0, `${table}: tenant A should see its own rows`)
    assert.ok(rows.every((r) => r.team_id === A), `${table}: tenant A saw another tenant's rows`)
  }
})

test('a cross-tenant write is refused on every tenant table', async () => {
  const tables = ['settings', 'briefs', 'drafts', 'audit_log', 'kanban_cards', 'approvals',
    'send_time_events', 'benchmark_entries', 'audience_health_snapshots',
    'campaigns', 'planner_settings', 'sessions']
  for (const table of tables) {
    await assert.rejects(
      withTenant(pool, B, (c) => c.query(`insert into ${table} (team_id) values ($1)`, [A])),
      (e) => /row-level security|null value|violates/.test(e.message),
      `${table}: a cross-tenant insert was not refused`)
  }
})

test('a connection that never sets a tenant sees nothing', async () => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query('select count(*)::int n from kanban_cards')
    assert.equal(rows[0].n, 0)
  } finally { client.release() }
})
