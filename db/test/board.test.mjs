import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const BARE = '33333333-3333-3333-3333-333333333333'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2), ($3, $4)',
    [TEAM, 'Marketing', BARE, 'Unseeded Team'])
  await c.query('select seed_default_columns($1)', [TEAM])
})
after(async () => { await c.end() })

test('seeding creates the three default columns', async () => {
  const { rows } = await c.query(
    'select id from kanban_columns where team_id = $1 order by display_order', [TEAM])
  assert.deepEqual(rows.map(r => r.id), ['briefed', 'in-progress', 'distributed'])
})

test('seeding twice is safe', async () => {
  await c.query('select seed_default_columns($1)', [TEAM])
  const { rows } = await c.query(
    'select count(*)::int n from kanban_columns where team_id = $1', [TEAM])
  assert.equal(rows[0].n, 3)
})

test('a card for a team with no seeded columns is rejected', async () => {
  await assert.rejects(
    c.query(`insert into kanban_cards (team_id, brief_id, email_name)
             values ($1, 'b-x', 'Unseeded')`, [BARE]),
    /violates foreign key constraint/)
})

test('a card for a seeded team is accepted and defaults to briefed', async () => {
  await c.query(`insert into kanban_cards (team_id, brief_id, email_name)
                 values ($1, 'b-1', 'Taking Stock')`, [TEAM])
  const { rows } = await c.query(`select "column", comments from kanban_cards where brief_id = 'b-1'`)
  assert.equal(rows[0].column, 'briefed')
  assert.deepEqual(rows[0].comments, [])
})

test('progress outside 0-100 is rejected', async () => {
  await assert.rejects(
    c.query(`insert into kanban_cards (team_id, brief_id, progress)
             values ($1, 'b-2', 150)`, [TEAM]),
    /kanban_cards_progress_check/)
})

test('omitted array columns default to empty, not null', async () => {
  await c.query(`insert into kanban_cards (team_id, brief_id) values ($1, 'b-3')`, [TEAM])
  const { rows } = await c.query(`select region, channel, client_group from kanban_cards where brief_id = 'b-3'`)
  assert.deepEqual(rows[0].region, [])
  assert.deepEqual(rows[0].channel, [])
  assert.deepEqual(rows[0].client_group, [])
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
