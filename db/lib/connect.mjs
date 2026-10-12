import pg from 'pg'

export function poolConfig(env = process.env) {
  const ssl = env.PGSSL === 'require' ? { rejectUnauthorized: true } : false
  return {
    host: env.PGHOST,
    port: Number(env.PGPORT ?? 5432),
    user: env.PGUSER,
    database: env.PGDATABASE,
    password: env.PGPASSWORD,
    ssl,
  }
}

export async function withClient(fn) {
  const client = new pg.Client(poolConfig())
  await client.connect()
  try { return await fn(client) } finally { await client.end() }
}
