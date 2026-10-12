import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import { poolConfig } from '../lib/connect.mjs'
import { runMigrations } from '../migrate.mjs'

let client
before(async () => {
  client = new pg.Client(poolConfig())
  await client.connect()
  await client.query('drop table if exists schema_migrations, widget')
})
after(async () => {
  await client.query('drop table if exists schema_migrations, widget')
  await client.end()
})

async function fixtureDir() {
  const dir = await mkdtemp(join(tmpdir(), 'mig-'))
  await writeFile(join(dir, '001_widget.sql'),
    'create table if not exists widget (id int primary key);')
  return dir
}

test('applies pending migrations in filename order', async () => {
  const dir = await fixtureDir()
  const applied = await runMigrations(client, dir)
  assert.deepEqual(applied, ['001_widget.sql'])
  const { rows } = await client.query("select to_regclass('public.widget') as t")
  assert.ok(rows[0].t)
})

test('re-running applies nothing and does not fail', async () => {
  const dir = await fixtureDir()
  await runMigrations(client, dir)
  const second = await runMigrations(client, dir)
  assert.deepEqual(second, [])
})
