import { getMetadata } from '../auth/entra.mjs'
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
}
