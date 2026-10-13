export function testEnv(overrides = {}) {
  return {
    PORT: '0', APP_ORIGIN: 'http://localhost:5173',
    SESSION_COOKIE_SECRET: 'test-secret-at-least-32-chars-long!!',
    SESSION_TTL_SECONDS: '3600',
    DEFAULT_TEAM_ID: '11111111-1111-1111-1111-111111111111',
    ENTRA_TENANT_ID: 'test-tenant', ENTRA_CLIENT_ID: 'test-client',
    ENTRA_CLIENT_SECRET: 'test-client-secret',
    ENTRA_REDIRECT_URI: 'http://localhost:8080/auth/callback',
    PGHOST: 'localhost', PGPORT: '55432', PGUSER: 'postgres',
    PGDATABASE: 'postgres', PGPASSWORD: 'localdev', PGSSL: 'off',
    ...overrides,
  }
}
