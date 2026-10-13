import pg from 'pg'

// TLS is on unless explicitly opted out. An unrecognised PGSSL value is an
// error rather than a silent downgrade: the Azure connection carries the
// database password, and failing open here would put it on the wire.
const SSL_OFF = new Set(['off', 'disable', 'disabled', 'false', '0'])
const SSL_ON = new Set(['require', 'required', 'true', '1', 'on', 'verify-full'])

export function sslSetting(raw) {
  if (raw === undefined || raw === null || raw === '') return { rejectUnauthorized: true }
  const v = String(raw).trim().toLowerCase()
  if (SSL_ON.has(v)) return { rejectUnauthorized: true }
  if (SSL_OFF.has(v)) return false
  throw new Error(`PGSSL: unrecognised value ${JSON.stringify(raw)}; use "require" or "off"`)
}

export function poolConfig(env = process.env) {
  return {
    host: env.PGHOST,
    port: Number(env.PGPORT ?? 5432),
    user: env.PGUSER,
    database: env.PGDATABASE,
    password: env.PGPASSWORD,
    ssl: sslSetting(env.PGSSL),
    application_name: env.PGAPPNAME ?? 'ni-briefing-db',
    connectionTimeoutMillis: 15_000,
  }
}

export async function withClient(fn) {
  const client = new pg.Client(poolConfig())
  await client.connect()
  try { return await fn(client) } finally { await client.end() }
}
