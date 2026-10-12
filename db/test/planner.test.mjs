import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Test User')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('a campaign defaults to planning and the brand green', async () => {
  await c.query(`insert into campaigns (team_id, name, created_by) values ($1, 'Q1 Push', $2)`, [TEAM, USER])
  const { rows } = await c.query(`select status, colour, tags from campaigns where name = 'Q1 Push'`)
  assert.equal(rows[0].status, 'planning')
  assert.equal(rows[0].colour, '#134848')
  assert.deepEqual(rows[0].tags, [])
})

test('an invalid campaign status is rejected', async () => {
  await assert.rejects(
    c.query(`insert into campaigns (team_id, name, created_by, status) values ($1, 'Bad', $2, 'live')`, [TEAM, USER]),
    /campaigns_status_check/)
})

test('deleting a campaign removes its brief links', async () => {
  const { rows } = await c.query(
    `insert into campaigns (team_id, name, created_by) values ($1, 'Temp', $2) returning id`, [TEAM, USER])
  await c.query(`insert into campaign_briefs (team_id, campaign_id, brief_id, added_by)
                 values ($1, $2, 'b-1', $3)`, [TEAM, rows[0].id, USER])
  await c.query('delete from campaigns where id = $1', [rows[0].id])
  const { rows: left } = await c.query(
    'select count(*)::int n from campaign_briefs where campaign_id = $1', [rows[0].id])
  assert.equal(left[0].n, 0)
})

test('planner settings is one row per team', async () => {
  await c.query(`insert into planner_settings (team_id, config) values ($1, '{"view":"kanban"}'::jsonb)`, [TEAM])
  await assert.rejects(
    c.query(`insert into planner_settings (team_id) values ($1)`, [TEAM]),
    /duplicate key value/)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
