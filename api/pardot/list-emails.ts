/**
 * POST /api/pardot/list-emails
 *
 * Vercel Edge Function — CORS proxy for Pardot list-email creation.
 *
 * The browser cannot call login.salesforce.com or pi.pardot.com directly
 * due to CORS restrictions. This function:
 *   1. Receives the list-email payload + Pardot credentials in request headers
 *   2. Exchanges client credentials for a Salesforce OAuth access token (server-side)
 *   3. Forwards the POST to the Pardot v5 API
 *   4. Returns the Pardot response to the browser
 *
 * Expected request headers:
 *   X-Pardot-Client-Id        — Salesforce Connected App Consumer Key
 *   X-Pardot-Client-Secret    — Salesforce Connected App Consumer Secret
 *   X-Pardot-Business-Unit-Id — 18-char Pardot Business Unit ID (starts with 0Uv)
 *   X-Pardot-Environment      — "production" | "sandbox"
 */

export const config = { runtime: 'edge' }

// ── CORS headers (allow same-origin + local dev) ──────────────────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'X-Pardot-Client-Id',
    'X-Pardot-Client-Secret',
    'X-Pardot-Business-Unit-Id',
    'X-Pardot-Environment',
  ].join(', '),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

async function getSalesforceToken(
  clientId: string,
  clientSecret: string,
  environment: string,
): Promise<{ access_token: string; instance_url: string }> {
  const loginBase =
    environment === 'sandbox'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com'

  const res = await fetch(`${loginBase}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Salesforce OAuth failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<{ access_token: string; instance_url: string }>
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(request: Request): Promise<Response> {
  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed — use POST' }, 405)
  }

  // Extract credentials from headers
  const clientId       = request.headers.get('X-Pardot-Client-Id')       ?? ''
  const clientSecret   = request.headers.get('X-Pardot-Client-Secret')   ?? ''
  const businessUnitId = request.headers.get('X-Pardot-Business-Unit-Id') ?? ''
  const environment    = request.headers.get('X-Pardot-Environment')      ?? 'production'

  if (!clientId || !clientSecret || !businessUnitId) {
    return jsonResponse(
      { error: 'Missing credentials', details: 'Headers X-Pardot-Client-Id, X-Pardot-Client-Secret, and X-Pardot-Business-Unit-Id are all required.' },
      400,
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  try {
    // 1. Get Salesforce access token
    const { access_token, instance_url } = await getSalesforceToken(clientId, clientSecret, environment)

    // 2. Derive Pardot base URL from instance_url (preferred) or environment default
    const pardotBase =
      instance_url?.trim()
        ? instance_url.replace(/\/$/, '')
        : environment === 'sandbox'
          ? 'https://pi.demo.pardot.com'
          : 'https://pi.pardot.com'

    // 3. Forward to Pardot v5 list-emails endpoint
    const pardotRes = await fetch(`${pardotBase}/api/v5/objects/list-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Pardot-Business-Unit-Id': businessUnitId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const responseText = await pardotRes.text()
    return new Response(responseText, {
      status: pardotRes.status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: 'Proxy error', details: message }, 502)
  }
}
