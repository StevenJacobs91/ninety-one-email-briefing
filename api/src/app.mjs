import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.mjs'
import { createPool } from './db.mjs'
import { makeAuthenticate } from './auth/require-auth.mjs'

export async function buildApp(config, opts = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.cookie', 'req.headers.authorization',
               '*.password', '*.clientSecret', '*.cookieSecret', '*.connectionParameters'],
    },
    // One hop: the ingress in front of us. `true` trusts X-Forwarded-For from
    // any peer, making req.ip client-controlled.
    trustProxy: 1,
  })

  await app.register(cookie, { secret: config.cookieSecret })
  await app.register(rateLimit, {
    global: false,
    // Keyed on the socket, not req.ip: X-Forwarded-For is attacker-supplied.
    keyGenerator: (req) => req.socket.remoteAddress ?? 'unknown',
  })

  // A database error must never reach the client: SQLSTATE codes, column and
  // constraint names are all disclosable through a default 500 body.
  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode ?? 500
    if (status >= 500) {
      req.log.error({ err }, 'request failed')
      return reply.code(500).send({ error: 'something went wrong' })
    }
    return reply.code(status).send({ error: err.message })
  })
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
