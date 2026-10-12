import { getMetadata, exchangeCode, verifyIdToken } from '../auth/entra.mjs'
import { provisionProfile } from '../auth/profiles.mjs'
import { createSession } from '../auth/sessions.mjs'
import { createVerifier, challengeFor, randomToken } from '../auth/pkce.mjs'

export const AUTH_COOKIE = 'ni_auth'
export const SESSION_COOKIE = 'ni_session'
const AUTH_COOKIE_TTL_SECONDS = 600

export async function authRoutes(app, { metadata: injectedMetadata, pool } = {}) {
  const config = app.config
  const metadataFor = async () => injectedMetadata ?? getMetadata(config)
  const secure = config.appOrigin.startsWith('https')

  app.get('/auth/login', async (req, reply) => {
    const metadata = await metadataFor()
    const state = randomToken()
    const nonce = randomToken()
    const verifier = createVerifier()

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

  app.get('/auth/callback', async (req, reply) => {
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
      return reply.code(400).send({ error: 'sign-in has expired; please start again' })
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

    const profile = await provisionProfile(pool, {
      oid: claims.oid, email: claims.email, name: claims.name,
      defaultTeamId: config.defaultTeamId,
    })

    const sessionId = await createSession(pool, {
      profileId: profile.id, teamId: profile.teamId,
      ttlSeconds: config.sessionTtlSeconds,
      userAgent: req.headers['user-agent'], ip: req.ip,
    })

    reply.setCookie(SESSION_COOKIE, sessionId, {
      path: '/', httpOnly: true, secure, sameSite: 'lax',
      signed: true, maxAge: config.sessionTtlSeconds,
    })

    return reply.redirect(config.appOrigin, 302)
  })
}
