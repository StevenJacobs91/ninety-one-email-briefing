import * as jose from 'jose'

export function discoveryUrl(tenantId) {
  return `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
}

let metadataCache = null

export async function getMetadata(config, fetchImpl = fetch) {
  if (metadataCache) return metadataCache
  const res = await fetchImpl(discoveryUrl(config.entra.tenantId),
    { signal: AbortSignal.timeout(5_000) })
  if (!res.ok) throw new Error(`Entra discovery failed: HTTP ${res.status}`)
  metadataCache = await res.json()
  return metadataCache
}

const jwksCache = new Map()
function jwks(metadata) {
  let set = jwksCache.get(metadata.jwks_uri)
  if (!set) {
    set = jose.createRemoteJWKSet(new URL(metadata.jwks_uri))
    jwksCache.set(metadata.jwks_uri, set)
  }
  return set
}

export async function verifyIdToken(token, { config, metadata, nonce }) {
  const { payload } = await jose.jwtVerify(token, jwks(metadata), {
    issuer: metadata.issuer,
    audience: config.entra.clientId,
    algorithms: ['RS256'],
    clockTolerance: '60 seconds',
    requiredClaims: ['oid', 'tid'],
  })

  // Checked only after the signature verifies. Never before.
  if (!nonce || payload.nonce !== nonce) {
    throw new Error('id_token nonce did not match the value issued for this sign-in')
  }
  if (payload.tid !== config.entra.tenantId) {
    throw new Error('id_token came from a different Entra tenant')
  }
  if (typeof payload.oid !== 'string' || payload.oid.length === 0) {
    throw new Error('id_token has no usable oid claim')
  }

  return {
    oid: payload.oid,
    tid: payload.tid,
    email: payload.preferred_username ?? payload.email ?? null,
    name: payload.name ?? '',
  }
}

export async function exchangeCode({ config, metadata, code, codeVerifier }, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: config.entra.clientId,
    client_secret: config.entra.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.entra.redirectUri,
    code_verifier: codeVerifier,
  })

  // Unbounded, a slow token endpoint holds the request, the socket and
  // eventually a pool slot.
  const res = await fetchImpl(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5_000),
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || !json.id_token) {
    // json.error is Entra's own code. The request body is never echoed, so the
    // client secret cannot reach a log or an error response.
    throw new Error(`Entra token exchange failed: ${json.error ?? `HTTP ${res.status}`}`)
  }
  return json
}
