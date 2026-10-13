import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const A = '11111111-1111-1111-1111-111111111111'
const B = '44444444-4444-4444-4444-444444444444'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2), ($3, $4)',
    [A, 'Team A', B, 'Team B'])
  await c.query('select seed_default_columns($1), seed_default_columns($2)', [A, B])
  await c.query(`insert into kanban_cards (team_id, brief_id, email_name)
                 values ($1, 'a-1', 'Team A card'), ($2, 'b-1', 'Team B card')`, [A, B])
})
after(async () => { await c.end() })

async function asTeam(teamId, sql, params = []) {
  await c.query('begin')
  try {
    await c.query('set local role app_user')
    await c.query('select set_config($1, $2, true)', ['app.team_id', teamId])
    const res = await c.query(sql, params)
    await c.query('commit')
    return res
  } catch (e) { await c.query('rollback'); throw e }
}

test('a team sees only its own cards', async () => {
  const { rows } = await asTeam(A, 'select brief_id from kanban_cards')
  assert.deepEqual(rows.map(r => r.brief_id), ['a-1'])
})

test('a team cannot read another team rows', async () => {
  const { rows } = await asTeam(B, `select brief_id from kanban_cards where brief_id = 'a-1'`)
  assert.equal(rows.length, 0)
})

test('a team cannot update another team rows', async () => {
  const res = await asTeam(B, `update kanban_cards set notes = 'hacked' where brief_id = 'a-1'`)
  assert.equal(res.rowCount, 0)
})

test('a team cannot delete another team rows', async () => {
  const res = await asTeam(B, `delete from kanban_cards where brief_id = 'a-1'`)
  assert.equal(res.rowCount, 0)
})

test('inserting a row for another team is blocked', async () => {
  await assert.rejects(
    asTeam(B, `insert into kanban_cards (team_id, brief_id) values ($1, 'forged')`, [A]),
    /row-level security/)
})

test('every public table has RLS enabled', async () => {
  const { rows } = await c.query(`
    select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname <> 'schema_migrations' and not c.relrowsecurity`)
  assert.deepEqual(rows.map(r => r.relname), [])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
