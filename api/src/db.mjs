import pg from 'pg'

export function createPool(config) {
  const pool = new pg.Pool({
    host: config.pg.host, port: config.pg.port, user: config.pg.user,
    database: config.pg.database, password: config.pg.password, ssl: config.pg.ssl,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'ni-briefing-api',
  })

  // The app role must never be the table owner, or FORCE ROW LEVEL SECURITY is
  // the only thing standing between a bug and a cross-tenant read.
  pool.on('connect', (client) => {
    client.query('set role app_user').catch(() => {})
  })

  // Belt and braces for the contract in db/migrations/007_rls.sql. withTenant
  // already scopes app.team_id to a transaction; this guarantees that even a
  // stray SET cannot outlive the checkout and serve the next request under the
  // previous tenant's id.
  pool.on('release', (_err, client) => {
    client.query(`select set_config('app.team_id', '', false)`).catch(() => {})
  })

  return pool
}

export async function withTenant(pool, teamId, fn) {
  if (!teamId) throw new Error('withTenant: teamId is required')
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', ['app.team_id', teamId])
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Privileged: runs outside any tenant scope. Only two callers are legitimate —
// resolving a session cookie to its profile, and provisioning a profile on
// first sign-in. Both happen before a tenant is known. Anything else is a bug.
export async function withoutTenant(pool, fn) {
  const client = await pool.connect()
  try {
    await client.query('reset role')
    return await fn(client)
  } finally {
    await client.query('set role app_user').catch(() => {})
    client.release()
  }
}
