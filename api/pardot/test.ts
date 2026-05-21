/**
 * GET /api/pardot/test
 *
 * Vercel Edge Function — Pardot connection test.
 *
 * Validates that the supplied OAuth credentials are correct and that
 * the Business Unit ID grants API access. Returns a lightweight status
 * object so the Settings panel can show a live "connected" indicator.
 *
 * Expected request headers:
 *   X-Pardot-Client-Id        — Salesforce Connected App Consumer Key
 *   X-Pardot-Client-Secret    — Salesforce Connected App Consumer Secret
 *   X-Pardot-Business-Unit-Id — 18-char Pardot Business Unit ID
 *   X-Pardot-Environment      — "production" | "sandbox"
 *
 * Success response shape:
 *   { ok: true, accountName: string, instanceUrl: string, apiVersion: "v5" }
 *
 * Failure response shape:
 *   { ok: false, error: string, details?: string }
 */

export const config = { runtime: 'edge' }

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'X-Pardot-Client-Id',
    'X-Pardot-Client-Secret',
    'X-Pardot-Business-Unit-Id',
    'X-Pardot-Environment',
  ].join(', '),
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (request.method !== 'GET') {
    return jsonResponse({ ok: false, error: 'Method not allowed — use GET' }, 405)
  }

  const clientId       = request.headers.get('X-Pardot-Client-Id')        ?? ''
  const clientSecret   = request.headers.get('X-Pardot-Client-Secret')    ?? ''
  const businessUnitId = request.headers.get('X-Pardot-Business-Unit-Id') ?? ''
  const environment    = request.headers.get('X-Pardot-Environment')       ?? 'production'

  if (!clientId || !clientSecret || !businessUnitId) {
    return jsonResponse(
      { ok: false, error: 'Incomplete credentials', details: 'Client ID, Client Secret, and Business Unit ID are all required.' },
      400,
    )
  }

  try {
    // Step 1 — Exchange credentials for access token
    const loginBase =
      environment === 'sandbox'
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com'

    const tokenRes = await fetch(`${loginBase}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => `HTTP ${tokenRes.status}`)
      // Distinguish between bad credentials and other errors
      if (tokenRes.status === 400 || tokenRes.status === 401) {
        return jsonResponse({ ok: false, error: 'Invalid OAuth credentials', details: errText }, 401)
      }
      return jsonResponse({ ok: false, error: `Salesforce token error (${tokenRes.status})`, details: errText }, 502)
    }

    const { access_token, instance_url } = await tokenRes.json() as { access_token: string; instance_url: string }

    // Step 2 — Probe Pardot API with a minimal lists query to confirm Business Unit access
    const pardotBase =
      instance_url?.trim()
        ? instance_url.replace(/\/$/, '')
        : environment === 'sandbox'
          ? 'https://pi.demo.pardot.com'
          : 'https://pi.pardot.com'

    const probeRes = await fetch(
      `${pardotBase}/api/v5/objects/lists?fields=id,name&pageSize=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Pardot-Business-Unit-Id': businessUnitId,
          'Accept': 'application/json',
        },
      },
    )

    if (!probeRes.ok) {
      const errText = await probeRes.text().catch(() => `HTTP ${probeRes.status}`)
      if (probeRes.status === 403) {
        return jsonResponse(
          { ok: false, error: 'Business Unit access denied', details: `The Business Unit ID "${businessUnitId}" is not accessible with these credentials. ${errText}` },
          403,
        )
      }
      return jsonResponse({ ok: false, error: `Pardot API error (${probeRes.status})`, details: errText }, 502)
    }

    // Success — extract account name from the instance URL hostname
    const hostname     = new URL(pardotBase).hostname          // e.g. "ninetyone.my.salesforce.com"
    const accountName  = hostname.split('.')[0] ?? 'Connected' // "ninetyone"

    return jsonResponse({
      ok: true,
      accountName,
      instanceUrl: pardotBase,
      apiVersion: 'v5',
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: 'Unexpected proxy error', details: message }, 502)
  }
}
