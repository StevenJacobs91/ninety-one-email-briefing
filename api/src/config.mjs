const REQUIRED = [
  'APP_ORIGIN', 'SESSION_COOKIE_SECRET', 'DEFAULT_TEAM_ID',
  'ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET', 'ENTRA_REDIRECT_URI',
  'PGHOST', 'PGUSER', 'PGDATABASE', 'PGPASSWORD',
]

// Secrets are attached non-enumerably, so a stray JSON.stringify(config) or a
// logged error object cannot leak them.
function hide(target, values) {
  for (const [k, v] of Object.entries(values)) {
    Object.defineProperty(target, k, { value: v, enumerable: false, writable: false })
  }
  return target
}

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((k) => !env[k])
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  if (String(env.SESSION_COOKIE_SECRET).length < 32) {
    throw new Error('SESSION_COOKIE_SECRET must be at least 32 characters')
  }

  const entra = hide({
    tenantId: env.ENTRA_TENANT_ID,
    clientId: env.ENTRA_CLIENT_ID,
    redirectUri: env.ENTRA_REDIRECT_URI,
  }, { clientSecret: env.ENTRA_CLIENT_SECRET })

  const pg = hide({
    host: env.PGHOST, port: Number(env.PGPORT ?? 5432),
    user: env.PGUSER, database: env.PGDATABASE,
    ssl: env.PGSSL === 'off' || env.PGSSL === 'disable' ? false : { rejectUnauthorized: true },
  }, { password: env.PGPASSWORD })

  return hide({
    port: Number(env.PORT ?? 8080),
    appOrigin: env.APP_ORIGIN,
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 28800),
    defaultTeamId: env.DEFAULT_TEAM_ID,
    entra, pg,
  }, { cookieSecret: env.SESSION_COOKIE_SECRET })
}
