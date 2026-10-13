/**
 * Pardot (Salesforce Account Engagement) API client
 *
 * Auth flow: Salesforce OAuth 2.0 client_credentials → access_token
 * Then call Pardot Account Engagement REST API v5 via apiProxyUrl (CORS proxy)
 * or directly when running server-side / in n8n.
 *
 * Docs: https://developer.salesforce.com/docs/marketing/pardot/guide/overview.html
 */

import type { PardotConfig } from '../types/settings.types'
import type { BriefPayload } from '../types/brief.types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PardotTokenResponse {
  access_token: string
  instance_url: string
  token_type: string
  issued_at: string
}

export interface PardotListEmailPayload {
  name: string
  subject: string
  html_message: string
  text_message?: string
  from_name?: string
  from_email?: string
  reply_to_email?: string
  sender_type?: 'general_user' | 'specific_user' | 'assigned_user' | 'account_owner' | 'account_custom_field' | 'prospect_custom_field'
  sender_id?: number
  operational_email?: boolean
  list_ids?: number[]
  campaign_id?: number
}

export interface PardotListEmailResponse {
  id: number
  name: string
  subject: string
  status: 'Draft' | 'Sending' | 'Scheduled' | 'Sent' | 'Aborted'
  created_at: string
  updated_at: string
}

export interface PardotSubmitResult {
  success: boolean
  emailId?: number
  emailName?: string
  status?: string
  error?: string
  details?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the full API URL, routing through the proxy when configured */
function buildApiUrl(cfg: PardotConfig, path: string): string {
  const base = cfg.apiProxyUrl?.trim()
    ? cfg.apiProxyUrl.replace(/\/$/, '')
    : (cfg.instanceUrl?.trim() || (cfg.environment === 'sandbox' ? 'https://pi.demo.pardot.com' : 'https://pi.pardot.com'))
  return `${base}${path}`
}

/** Build standard Pardot API headers */
function buildHeaders(accessToken: string, businessUnitId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Pardot-Business-Unit-Id': businessUnitId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Exchange client credentials for a Salesforce access token.
 * NOTE: This must be called server-side (n8n / Edge Function) in production —
 * browsers cannot reach login.salesforce.com directly due to CORS.
 * When apiProxyUrl is set, the proxy is expected to handle token exchange too.
 */
export async function getPardotAccessToken(cfg: PardotConfig): Promise<PardotTokenResponse> {
  const loginUrl = cfg.environment === 'sandbox'
    ? 'https://test.salesforce.com'
    : 'https://login.salesforce.com'

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  })

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Salesforce OAuth failed (${response.status}): ${err}`)
  }

  return response.json() as Promise<PardotTokenResponse>
}

// ── List Email operations ──────────────────────────────────────────────────────

/** Create a draft List Email in Pardot */
export async function createPardotListEmail(
  cfg: PardotConfig,
  accessToken: string,
  payload: PardotListEmailPayload,
): Promise<PardotListEmailResponse> {
  const url = buildApiUrl(cfg, '/api/v5/objects/list-emails')
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(accessToken, cfg.businessUnitId),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Pardot createListEmail failed (${response.status}): ${err}`)
  }

  const json = await response.json() as { listEmail?: PardotListEmailResponse; values?: PardotListEmailResponse }
  // v5 API wraps in { values: [...] } for lists, single object otherwise
  return (json.values as unknown as PardotListEmailResponse) ?? (json.listEmail ?? json) as PardotListEmailResponse
}

/** Fetch a List Email by ID */
export async function getPardotListEmail(
  cfg: PardotConfig,
  accessToken: string,
  emailId: number,
): Promise<PardotListEmailResponse> {
  const url = buildApiUrl(cfg, `/api/v5/objects/list-emails/${emailId}`)
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(accessToken, cfg.businessUnitId),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Pardot getListEmail failed (${response.status}): ${err}`)
  }

  return response.json() as Promise<PardotListEmailResponse>
}

/** Query List Emails */
export async function queryPardotListEmails(
  cfg: PardotConfig,
  accessToken: string,
  params?: { fields?: string; pageSize?: number; nextPageToken?: string },
): Promise<{ values: PardotListEmailResponse[]; nextPageToken?: string }> {
  const qs = new URLSearchParams()
  if (params?.fields) qs.set('fields', params.fields)
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params?.nextPageToken) qs.set('nextPageToken', params.nextPageToken)

  const url = buildApiUrl(cfg, `/api/v5/objects/list-emails${qs.toString() ? `?${qs}` : ''}`)
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(accessToken, cfg.businessUnitId),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Pardot queryListEmails failed (${response.status}): ${err}`)
  }

  return response.json() as Promise<{ values: PardotListEmailResponse[]; nextPageToken?: string }>
}

// ── Main submit function ───────────────────────────────────────────────────────

/**
 * Submit a brief's generated email HTML to Pardot as a draft List Email.
 *
 * If `cfg.useMockData` is true, returns a simulated success response without
 * making any real API calls — useful for dev/staging environments.
 *
 * Flow:
 *  1. If apiProxyUrl is set → POST to proxy with full payload (proxy handles auth)
 *  2. Otherwise → get token directly then call Pardot (server-side only)
 */
export async function submitBriefToPardot(
  cfg: PardotConfig,
  brief: BriefPayload,
  html: string,
  textBody: string,
  emailName: string,
): Promise<PardotSubmitResult> {

  // ── Mock mode ──────────────────────────────────────────────────────────────
  if (cfg.useMockData) {
    await new Promise((r) => setTimeout(r, 1200)) // simulate latency
    return {
      success: true,
      emailId: Math.floor(Math.random() * 99999) + 10000,
      emailName: `[MOCK] ${emailName}`,
      status: 'Draft',
    }
  }

  // ── Validate config ────────────────────────────────────────────────────────
  if (!cfg.clientId || !cfg.clientSecret || !cfg.businessUnitId) {
    return {
      success: false,
      error: 'Pardot not configured',
      details: 'Client ID, Client Secret, and Business Unit ID are required. Configure them in Settings → Pardot.',
    }
  }

  // ── Build field-mapped payload ─────────────────────────────────────────────
  // Start from built-in fields, then apply any custom field mappings
  const getField = (path: string): string => {
    const parts = path.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = brief
    for (const p of parts) val = val?.[p]
    return typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : String(val ?? '')
  }

  // Resolve list IDs from audience + campaign preset
  const listIdFromAudience = brief.audience?.pardotListId?.trim()
  const listIds: number[] = listIdFromAudience
    ? listIdFromAudience.split(/[,\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0)
    : []

  // Build the list-email payload
  const emailPayload: PardotListEmailPayload = {
    name: emailName,
    subject: brief.campaign?.subjectLine || emailName,
    html_message: html,
    text_message: textBody,
    from_name: brief.campaign?.fromName || 'Ninety One',
    from_email: (brief.campaign as unknown as Record<string, string>)?.fromAddress || '',
    reply_to_email: brief.campaign?.replyToEmail || '',
    sender_type: (cfg.senderType as PardotListEmailPayload['sender_type']) || 'general_user',
    operational_email: false,
  }

  if (listIds.length > 0) emailPayload.list_ids = listIds
  if (cfg.senderUserId) emailPayload.sender_id = Number(cfg.senderUserId)

  // Apply any extra field mappings configured in settings
  if (cfg.fieldMappings?.length) {
    for (const mapping of cfg.fieldMappings) {
      if (mapping.apiObject === 'list-email' && mapping.apiParameter && mapping.formField) {
        const value = getField(mapping.formField)
        if (value) (emailPayload as unknown as Record<string, unknown>)[mapping.apiParameter] = value
      }
    }
  }

  try {
    // ── Proxy path (browser-safe) ────────────────────────────────────────────
    if (cfg.apiProxyUrl?.trim()) {
      const proxyUrl = cfg.apiProxyUrl.replace(/\/$/, '')
      const response = await fetch(`${proxyUrl}/pardot/list-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Proxy is responsible for auth — just pass credentials for it to exchange
          'X-Pardot-Client-Id': cfg.clientId,
          'X-Pardot-Client-Secret': cfg.clientSecret,
          'X-Pardot-Business-Unit-Id': cfg.businessUnitId,
          'X-Pardot-Environment': cfg.environment,
        },
        body: JSON.stringify(emailPayload),
      })

      if (!response.ok) {
        const errText = await response.text()
        return { success: false, error: `Proxy returned ${response.status}`, details: errText }
      }

      const result = await response.json() as PardotListEmailResponse
      return {
        success: true,
        emailId: result.id,
        emailName: result.name,
        status: result.status,
      }
    }

    // ── Direct path (server-side / dev only) ─────────────────────────────────
    const tokenData = await getPardotAccessToken(cfg)
    const result = await createPardotListEmail(cfg, tokenData.access_token, emailPayload)
    return {
      success: true,
      emailId: result.id,
      emailName: result.name,
      status: result.status,
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: 'Pardot API error', details: message }
  }
}
