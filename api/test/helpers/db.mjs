import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS = fileURLToPath(new URL('../../../db/migrations/', import.meta.url))

// The pool pins role=app_user at connection level, so test fixtures that need
// to write across tenants borrow the owner explicitly and always hand the role
// back — leaving a pooled connection escalated would make later tests pass for
// the wrong reason.
export async function asOwner(pool, fn) {
  const c = await pool.connect()
  try {
    await c.query('set role none')
    return await fn(c)
  } finally {
    await c.query('set role app_user').catch(() => {})
    c.release()
  }
}

export async function resetSchema(pool) {
  const c = await pool.connect()
  try {
    await c.query('set role none')
    await c.query('drop schema public cascade; create schema public;')
    for (const f of (await readdir(MIGRATIONS)).filter((f) => f.endsWith('.sql')).sort()) {
      await c.query(await readFile(join(MIGRATIONS, f), 'utf8'))
    }
  } finally {
    await c.query('set role app_user').catch(() => {})
    c.release()
  }
}

export async function seedTeam(pool, id, name) {
  return asOwner(pool, async (c) => {
    await c.query('insert into teams (id, name) values ($1, $2)', [id, name])
    await c.query('select seed_default_columns($1)', [id])
  })
}
