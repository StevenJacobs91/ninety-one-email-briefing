import Fastify from 'fastify'
import cookie from '@fastify/cookie'

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

  app.get('/healthz', async () => ({ status: 'ok' }))

  return app
}
