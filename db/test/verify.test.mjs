import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'
import { compareSchema } from '../verify.mjs'
import expected from '../expected-schema.json' with { type: 'json' }

let c
before(async () => {
  c = new pg.Client(poolConfig()); await c.connect()
  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
})
after(async () => { await c.end() })

test('a fully migrated database reports no differences', async () => {
  const r = await compareSchema(c, expected)
  assert.deepEqual(r.missingTables, [])
  assert.deepEqual(r.missingColumns, [])
  assert.deepEqual(r.authReferences, [])
})

test('a dropped column is reported', async () => {
  await c.query('alter table kanban_cards drop column assignee')
  const r = await compareSchema(c, expected)
  assert.ok(r.missingColumns.includes('kanban_cards.assignee'))
  await c.query('alter table kanban_cards add column assignee text')
})

test('a dropped table is reported', async () => {
  await c.query('drop table planner_settings')
  const r = await compareSchema(c, expected)
  assert.ok(r.missingTables.includes('planner_settings'))
})

test('the CLI prints a report to stdout and exits non-zero on a difference', async () => {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)

  await c.query('drop schema public cascade; create schema public;')
  await runMigrations(c)
  const ok = await run('node', ['verify.mjs'], { cwd: process.cwd() })
  assert.match(ok.stdout, /Schema reconciliation/)
  assert.match(ok.stdout, /Schema matches\./)

  await c.query('drop table planner_settings')
  const bad = await run('node', ['verify.mjs'], { cwd: process.cwd() })
    .catch(e => e)
  assert.equal(bad.code, 1)
  assert.match(bad.stdout, /planner_settings/)
})
