import pg from 'pg'

export function createPool(config) {
  const pool = new pg.Pool({
    host: config.pg.host, port: config.pg.port, user: config.pg.user,
    database: config.pg.database, password: config.pg.password, ssl: config.pg.ssl,
    // The role is pinned at connection level, not by a post-connect statement.
    // A statement can fail and be swallowed, leaving a pooled connection running
    // as the privileged login role with tenant isolation silently off.
    options: '-c role=app_user',
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    application_name: 'ni-briefing-api',
  })

  // Belt and braces for the contract in db/migrations/007_rls.sql.
  pool.on('release', (_err, client) => {
    client.query(`select set_config('app.team_id', '', false)`).catch(() => {})
  })

  // Without this, an idle client failing (Azure maintenance, failover,
  // idle_session_timeout) throws out of the EventEmitter and exits the process.
  pool.on('error', (err) => {
    console.error(JSON.stringify({ level: 'error', msg: 'idle client error', err: err.message }))
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
