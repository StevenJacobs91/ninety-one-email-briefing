import { resolveSession } from './sessions.mjs'
import { SESSION_COOKIE } from '../routes/auth.mjs'

export function makeAuthenticate(pool) {
  return async function authenticate(req, reply) {
    const raw = req.cookies[SESSION_COOKIE]
    const unsigned = raw ? req.unsignCookie(raw) : { valid: false }
    if (!unsigned.valid) return reply.code(401).send({ error: 'not signed in' })

    const session = await resolveSession(pool, unsigned.value)
    if (!session) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      return reply.code(401).send({ error: 'not signed in' })
    }
    req.user = { ...session, sessionId: session.id }
  }
}

export function requireRole(...roles) {
  return async function roleGuard(req, reply) {
    if (!req.user) return reply.code(401).send({ error: 'not signed in' })
    if (!roles.includes(req.user.role)) {
      return reply.code(403).send({ error: 'you do not have access to this' })
    }
  }
}
