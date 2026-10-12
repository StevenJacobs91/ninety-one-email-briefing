import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createPool, withTenant, withoutTenant } from '../src/db.mjs'
import { loadConfig } from '../src/config.mjs'
import { testEnv } from './helpers/env.mjs'
import { resetSchema, seedTeam } from './helpers/db.mjs'

const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'
let pool

before(async () => {
  pool = createPool(loadConfig(testEnv()))
  await resetSchema(pool)
  await seedTeam(pool, A, 'Team A')
  await seedTeam(pool, B, 'Team B')
  await withoutTenant(pool, (c) => c.query(
    `insert into kanban_cards (team_id, brief_id, email_name)
     values ($1, 'a-1', 'A card'), ($2, 'b-1', 'B card')`, [A, B]))
})
after(async () => { await pool.end() })

test('a tenant sees only its own rows', async () => {
  const rows = await withTenant(pool, A, async (c) =>
    (await c.query('select brief_id from kanban_cards')).rows)
  assert.deepEqual(rows.map((r) => r.brief_id), ['a-1'])
})

test('the tenant id does not survive onto the next checkout of the same connection', async () => {
  await withTenant(pool, A, (c) => c.query('select 1'))
  const leaked = await withoutTenant(pool, async (c) =>
    (await c.query(`select current_setting('app.team_id', true) as v`)).rows[0].v)
  assert.ok(leaked === null || leaked === '', `app.team_id leaked across checkouts: ${leaked}`)
})

test('an error inside the callback rolls back and does not commit', async () => {
  await assert.rejects(withTenant(pool, A, async (c) => {
    await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'rollback-me')`, [A])
    throw new Error('boom')
  }), /boom/)
  const rows = await withTenant(pool, A, async (c) =>
    (await c.query(`select 1 from kanban_cards where brief_id = 'rollback-me'`)).rows)
  assert.equal(rows.length, 0)
})

test('writing a row for another tenant is refused by the database', async () => {
  await assert.rejects(
    withTenant(pool, B, (c) =>
      c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'forged')`, [A])),
    /row-level security/)
})

test('a null tenant id is refused before it reaches the database', async () => {
  await assert.rejects(withTenant(pool, null, (c) => c.query('select 1')),
    /teamId is required/)
})
