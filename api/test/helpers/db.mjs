import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS = fileURLToPath(new URL('../../../db/migrations/', import.meta.url))

export async function resetSchema(pool) {
  const c = await pool.connect()
  try {
    await c.query('reset role')
    await c.query('drop schema public cascade; create schema public;')
    for (const f of (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()) {
      await c.query(await readFile(join(MIGRATIONS, f), 'utf8'))
    }
  } finally { c.release() }
}

export async function seedTeam(pool, id, name) {
  const c = await pool.connect()
  try {
    await c.query('reset role')
    await c.query('insert into teams (id, name) values ($1, $2)', [id, name])
    await c.query('select seed_default_columns($1)', [id])
  } finally { c.release() }
}
