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
  await c.query(`insert into profiles (id, team_id, display_name, email)
                 values ($1, $2, 'Test User', 'test@ninetyone.com')`, [USER, TEAM])
})
after(async () => { await c.end() })

test('settings is one row per team', async () => {
  await c.query(`insert into settings (team_id, data) values ($1, '{"brandThemes":[]}'::jsonb)`, [TEAM])
  await assert.rejects(
    c.query(`insert into settings (team_id, data) values ($1, '{}'::jsonb)`, [TEAM]),
    /duplicate key value/)
})

test('a brief stores its payload and defaults to draft status', async () => {
  await c.query(`insert into briefs (team_id, brief_id, created_by, campaign_name, data)
                 values ($1, 'brief-1', $2, 'Taking Stock', '{"campaign":{}}'::jsonb)`, [TEAM, USER])
  const { rows } = await c.query('select status from briefs where brief_id = $1', ['brief-1'])
  assert.equal(rows[0].status, 'draft')
})

test('an invalid brief status is rejected', async () => {
  await assert.rejects(
    c.query(`insert into briefs (team_id, brief_id, status) values ($1, 'b2', 'published')`, [TEAM]),
    /briefs_status_check/)
})

test('a draft name is unique per user per team', async () => {
  await c.query(`insert into drafts (team_id, user_id, name) values ($1, $2, 'Q4 draft')`, [TEAM, USER])
  await assert.rejects(
    c.query(`insert into drafts (team_id, user_id, name) values ($1, $2, 'Q4 draft')`, [TEAM, USER]),
    /duplicate key value/)
})

test('audit entries reference profiles, not auth.users', async () => {
  await c.query(`insert into audit_log (team_id, user_id, user_email, action)
                 values ($1, $2, 'test@ninetyone.com', 'Signed in')`, [TEAM, USER])
  const { rows } = await c.query('select category from audit_log where action = $1', ['Signed in'])
  assert.equal(rows[0].category, 'general')
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
