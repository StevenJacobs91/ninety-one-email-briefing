import { getMetadata, exchangeCode, verifyIdToken } from '../auth/entra.mjs'
import { provisionProfile } from '../auth/profiles.mjs'
import { createSession, revokeSession, openAuthRequest, claimAuthRequest }
  from '../auth/sessions.mjs'
import { isIP } from 'node:net'
import { createVerifier, challengeFor, randomToken } from '../auth/pkce.mjs'

export const AUTH_COOKIE = 'ni_auth'
export const SESSION_COOKIE = 'ni_session'
const AUTH_COOKIE_TTL_SECONDS = 600

export async function authRoutes(app, { metadata: injectedMetadata, pool } = {}) {
  const config = app.config
  const metadataFor = async () => injectedMetadata ?? getMetadata(config)
  const secure = config.appOrigin.startsWith('https')

  // /auth/login mints cookies for free; /auth/callback makes an outbound POST
  // to Entra for every request, which is a request-amplification primitive
  // pointed at Ninety One's own tenant.
  const signInLimit = { rateLimit: { max: 20, timeWindow: '1 minute' } }

  app.get('/auth/login', { config: signInLimit }, async (req, reply) => {
    const metadata = await metadataFor()
    const state = randomToken()
    const nonce = randomToken()
    const verifier = createVerifier()

    await openAuthRequest(pool, state)

    reply.setCookie(AUTH_COOKIE, JSON.stringify({ state, nonce, verifier }), {
      path: '/auth', httpOnly: true, secure, sameSite: 'lax',
      signed: true, maxAge: AUTH_COOKIE_TTL_SECONDS,
    })

    const url = new URL(metadata.authorization_endpoint)
    url.searchParams.set('client_id', config.entra.clientId)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', config.entra.redirectUri)
    url.searchParams.set('response_mode', 'query')
    url.searchParams.set('scope', 'openid profile email')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)
    url.searchParams.set('code_challenge', await challengeFor(verifier))
    url.searchParams.set('code_challenge_method', 'S256')

    return reply.redirect(url.toString(), 302)
  })

  app.get('/auth/callback', { config: signInLimit }, async (req, reply) => {
    const raw = req.cookies[AUTH_COOKIE]
    const unsigned = raw ? reply.unsignCookie(raw) : { valid: false }
    reply.clearCookie(AUTH_COOKIE, { path: '/auth' })

    if (!unsigned.valid) {
      return reply.code(400).send({ error: 'sign-in has expired; please start again' })
    }

    let state, nonce, verifier
    try { ({ state, nonce, verifier } = JSON.parse(unsigned.value)) }
    catch { return reply.code(400).send({ error: 'sign-in has expired; please start again' }) }

    if (!req.query.code || !req.query.state || req.query.state !== state) {
      if (req.query.error) {
        req.log.warn({ entraError: req.query.error, detail: req.query.error_description },
          'Entra returned an error instead of a code')
      }
      return reply.code(400).send({ error: 'sign-in has expired; please start again' })
    }

    // Single use. The code travels in a URL (history, proxy logs, Referer), so
    // possession of the code plus the cookie must not mint a second session.
    if (!(await claimAuthRequest(pool, state))) {
      return reply.code(400).send({ error: 'this sign-in link has already been used' })
    }

    const metadata = await metadataFor()
    let claims
    try {
      const tokens = await exchangeCode(
        { config, metadata, code: req.query.code, codeVerifier: verifier })
      claims = await verifyIdToken(tokens.id_token, { config, metadata, nonce })
    } catch (err) {
      req.log.warn({ reason: err.message }, 'sign-in failed')
      return reply.code(401).send({ error: 'sign-in failed; please try again' })
    }

    let profile
    try {
      profile = await provisionProfile(pool, {
        oid: claims.oid, email: claims.email, name: claims.name,
        defaultTeamId: config.defaultTeamId,
      })
    } catch (err) {
      req.log.error({ err }, 'could not provision a profile')
      return reply.code(503).send({ error: 'sign-in is unavailable; please try again shortly' })
    }

    const sessionId = await createSession(pool, {
      profileId: profile.id, teamId: profile.teamId,
      ttlSeconds: config.sessionTtlSeconds,
      userAgent: req.headers['user-agent'],
      // req.ip is client-influenced via X-Forwarded-For; an unparseable value
      // is a 500 from the inet column and junk in the only forensic record.
      ip: isIP(req.ip) ? req.ip : null,
    })

    reply.setCookie(SESSION_COOKIE, sessionId, {
      path: '/', httpOnly: true, secure, sameSite: 'lax',
      signed: true, maxAge: config.sessionTtlSeconds,
    })

    return reply.redirect(config.appOrigin, 302)
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (req, reply) => {
    reply.header('cache-control', 'no-store')
    return {
      profileId: req.user.profileId, teamId: req.user.teamId,
      role: req.user.role, displayName: req.user.displayName, email: req.user.email,
    }
  })

  app.post('/auth/logout', async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE]
    const unsigned = raw ? req.unsignCookie(raw) : { valid: false }
    if (unsigned.valid) await revokeSession(pool, unsigned.value)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })
}
