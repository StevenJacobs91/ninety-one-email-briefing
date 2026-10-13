import * as jose from 'jose'
import { createServer } from 'node:http'

// A local stand-in for Entra: real RS256 keys, a real JWKS endpoint, real HTTP.
// Nothing on the verification path is mocked — only the provider is local.
export async function startFakeEntra({ issuer, audience }) {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true })
  const jwk = await jose.exportJWK(publicKey)
  Object.assign(jwk, { kid: 'test-key-1', alg: 'RS256', use: 'sig' })

  let tokenResponse = null
  const server = createServer((req, res) => {
    if (req.url.startsWith('/keys')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ keys: [jwk] }))
    }
    if (req.url.startsWith('/token')) {
      res.writeHead(tokenResponse?.status ?? 200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(tokenResponse?.body ?? {}))
    }
    res.writeHead(404); res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`

  return {
    base,
    metadata: {
      issuer,
      jwks_uri: `${base}/keys`,
      token_endpoint: `${base}/token`,
      authorization_endpoint: `${base}/authorize`,
    },
    async mintIdToken(claims = {}, overrides = {}) {
      const payload = {
        oid: '99999999-9999-9999-9999-999999999999',
        preferred_username: 'tester@ninetyone.com',
        name: 'Test User',
        tid: 'test-tenant',
        ...claims,
      }
      for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k]
      return new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
        .setIssuer(overrides.issuer ?? issuer)
        .setAudience(overrides.audience ?? audience)
        .setIssuedAt()
        .setExpirationTime(overrides.exp ?? '5m')
        .sign(privateKey)
    },
    setTokenResponse(r) { tokenResponse = r },
    async stop() { await new Promise((r) => server.close(r)) },
  }
}
