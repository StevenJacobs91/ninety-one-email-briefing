import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let c, approvalId
const TEAM = '11111111-1111-1111-1111-111111111111'
const USER = '22222222-2222-2222-2222-222222222222'

before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  await c.query('insert into teams (id, name) values ($1, $2)', [TEAM, 'Marketing'])
  await c.query(`insert into profiles (id, team_id, display_name) values ($1, $2, 'Test User')`, [USER, TEAM])
  const { rows } = await c.query(
    `insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
     values ($1, 'b-1', 'Taking Stock', $2, 'Test User', 'brand_guardian') returning id`, [TEAM, USER])
  approvalId = rows[0].id
})
after(async () => { await c.end() })

test('an approval defaults to pending at stage 1', async () => {
  const { rows } = await c.query('select status, stage, total_stages from approvals where id = $1', [approvalId])
  assert.equal(rows[0].status, 'pending')
  assert.equal(rows[0].stage, 1)
  assert.equal(rows[0].total_stages, 1)
})

test('an invalid approver role is rejected', async () => {
  await assert.rejects(
    c.query(`insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
             values ($1, 'b-2', 'X', $2, 'T', 'ceo')`, [TEAM, USER]),
    /approvals_approver_role_check/)
})

test('comments thread via parent_id', async () => {
  const { rows: parent } = await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-1', $3, 'Test User', 'admin', 'Top level') returning id`, [TEAM, approvalId, USER])
  await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, parent_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-1', $3, $4, 'Test User', 'admin', 'Reply')`, [TEAM, approvalId, parent[0].id, USER])
  const { rows } = await c.query(
    'select count(*)::int n from approval_comments where parent_id = $1', [parent[0].id])
  assert.equal(rows[0].n, 1)
})

test('deleting an approval removes its comments', async () => {
  const { rows } = await c.query(
    `insert into approvals (team_id, brief_id, email_name, requested_by, requested_by_name, approver_role)
     values ($1, 'b-9', 'Temp', $2, 'T', 'legal') returning id`, [TEAM, USER])
  await c.query(
    `insert into approval_comments (team_id, approval_id, brief_id, author_id, author_name, author_role, body)
     values ($1, $2, 'b-9', $3, 'T', 'admin', 'x')`, [TEAM, rows[0].id, USER])
  await c.query('delete from approvals where id = $1', [rows[0].id])
  const { rows: left } = await c.query(
    'select count(*)::int n from approval_comments where approval_id = $1', [rows[0].id])
  assert.equal(left[0].n, 0)
})

test('updated_at advances on update', async () => {
  const { rows: before } = await c.query('select updated_at from approvals where id = $1', [approvalId])
  await c.query(`update approvals set status = 'approved' where id = $1`, [approvalId])
  const { rows: after } = await c.query('select updated_at from approvals where id = $1', [approvalId])
  assert.ok(after[0].updated_at > before[0].updated_at)
})

test('re-running the migrations changes nothing', async () => {
  assert.deepEqual(await runMigrations(c), [])
})
