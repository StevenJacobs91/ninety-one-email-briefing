/**
 * GET /api/pardot/lists/:listId
 *
 * Vercel Edge Function — CORS proxy for Pardot list detail lookups.
 *
 * Fetches a single Pardot list by ID and returns health/stats data.
 * Handles OAuth token exchange server-side (browsers are blocked by CORS
 * from calling login.salesforce.com directly).
 *
 * Expected request headers:
 *   X-Pardot-Client-Id        — Salesforce Connected App Consumer Key
 *   X-Pardot-Client-Secret    — Salesforce Connected App Consumer Secret
 *   X-Pardot-Business-Unit-Id — 18-char Pardot Business Unit ID
 *   X-Pardot-Environment      — "production" | "sandbox"
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

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed — use GET' }, 405)
  }

  // Extract listId from URL path: /api/pardot/lists/:listId
  const url    = new URL(request.url)
  const listId = url.pathname.split('/').filter(Boolean).pop() ?? ''

  if (!listId) {
    return jsonResponse({ error: 'Missing list ID in URL path' }, 400)
  }

  // Extract credentials from headers
  const clientId       = request.headers.get('X-Pardot-Client-Id')        ?? ''
  const clientSecret   = request.headers.get('X-Pardot-Client-Secret')    ?? ''
  const businessUnitId = request.headers.get('X-Pardot-Business-Unit-Id') ?? ''
  const environment    = request.headers.get('X-Pardot-Environment')       ?? 'production'

  if (!clientId || !clientSecret || !businessUnitId) {
    return jsonResponse(
      { error: 'Missing credentials', details: 'Headers X-Pardot-Client-Id, X-Pardot-Client-Secret, and X-Pardot-Business-Unit-Id are all required.' },
      400,
    )
  }

  try {
    // 1. Get Salesforce access token
    const { access_token, instance_url } = await getSalesforceToken(clientId, clientSecret, environment)

    // 2. Derive Pardot base URL
    const pardotBase =
      instance_url?.trim()
        ? instance_url.replace(/\/$/, '')
        : environment === 'sandbox'
          ? 'https://pi.demo.pardot.com'
          : 'https://pi.pardot.com'

    // 3. Fetch list details from Pardot v5 API
    //    Request additional computed fields for health analysis
    const fields = [
      'id', 'name', 'description', 'isPublic', 'isCrmVisible',
      'createdAt', 'updatedAt',
      'numberOfProspects',
      'numberOfMailableProspects',
      'numberOfNeverActiveProspects',
      'numberOfHardBouncedProspects',
      'numberOfSoftBouncedProspects',
      'numberOfUnsubscribedProspects',
      'numberOfOptedInProspects',
    ].join(',')

    const pardotRes = await fetch(
      `${pardotBase}/api/v5/objects/lists/${encodeURIComponent(listId)}?fields=${fields}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Pardot-Business-Unit-Id': businessUnitId,
          'Accept': 'application/json',
        },
      },
    )

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
