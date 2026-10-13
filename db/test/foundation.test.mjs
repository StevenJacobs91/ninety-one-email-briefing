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
})
after(async () => { await c.end() })

test('a profile keyed on an Entra object id can be created', async () => {
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(
    `insert into profiles (id, team_id, display_name, email, role)
     values ($1, $2, 'Test User', 'test@ninetyone.com', 'admin')`, [USER, TEAM])
  const { rows } = await c.query('select role, team_id from profiles where id = $1', [USER])
  assert.equal(rows[0].role, 'admin')
  assert.equal(rows[0].team_id, TEAM)
})

test('no auth schema is referenced anywhere', async () => {
  const { rows } = await c.query(`
    select count(*)::int n from pg_constraint
     where contype = 'f' and confrelid::regclass::text like 'auth.%'`)
  assert.equal(rows[0].n, 0)
})

test('an invalid role is rejected', async () => {
  await assert.rejects(
    c.query(`insert into profiles (id, team_id, display_name, role)
             values (gen_random_uuid(), $1, 'X', 'superuser')`, [TEAM]),
    /profiles_role_check/)
})

test('deleting a team with profiles is blocked, not silently cascaded', async () => {
  await assert.rejects(c.query('delete from teams where id = $1', [TEAM]),
    /violates foreign key constraint/)
})

test('team_members exposes email without an auth join', async () => {
  const { rows } = await c.query('select id, email, display_name, role, team_id from team_members where id = $1', [USER])
  assert.equal(rows[0].email, 'test@ninetyone.com')
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
