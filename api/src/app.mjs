import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { authRoutes } from './routes/auth.mjs'
import { createPool } from './db.mjs'
import { makeAuthenticate } from './auth/require-auth.mjs'

export async function buildApp(config, opts = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.cookie', 'req.headers.authorization'],
    },
    trustProxy: true,
  })

  await app.register(cookie, { secret: config.cookieSecret })
  app.decorate('config', config)

  const pool = opts.pool === undefined ? createPool(config) : opts.pool
  if (pool) {
    app.decorate('pool', pool)
    if (opts.pool === undefined) app.addHook('onClose', async () => { await pool.end() })
  }
  // Decorated before authRoutes registers: /auth/me references app.authenticate
  // at route-definition time, not at request time.
  app.decorate('authenticate', makeAuthenticate(pool))

  app.get('/healthz', async () => ({ status: 'ok' }))

  await app.register(authRoutes, { metadata: opts.metadata, pool })

  return app
}
