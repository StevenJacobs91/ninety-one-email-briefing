import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withClient } from './lib/connect.mjs'

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

export async function runMigrations(client, dir = DEFAULT_DIR) {
  await client.query(`
    create table if not exists schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )`)

  const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()
  const { rows } = await client.query('select filename from schema_migrations')
  const done = new Set(rows.map(r => r.filename))
  const applied = []

  for (const file of files) {
    if (done.has(file)) continue
    const sql = await readFile(join(dir, file), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into schema_migrations (filename) values ($1)', [file])
      await client.query('commit')
      applied.push(file)
      console.log(`applied ${file}`)
    } catch (err) {
      await client.query('rollback')
      throw new Error(`migration ${file} failed: ${err.message}`, { cause: err })
    }
  }
  return applied
}

if (process.argv[2] === 'up') {
  await withClient(c => runMigrations(c))
  console.log('migrations up to date')
}
