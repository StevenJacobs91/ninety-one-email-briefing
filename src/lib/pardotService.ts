/**
 * pardotService.ts
 *
 * Pardot / Account Engagement list analysis service.
 *
 * Architecture:
 *   - `fetchPardotListAnalysis()` is the single public entry point.
 *   - When `pardotConfig.useMockData === true` (or no API credentials are set),
 *     it returns deterministic mock data seeded from the list identifier.
 *   - When real credentials are provided it calls the Salesforce Account
 *     Engagement (Pardot) v5 API via a proxy URL configured in Settings.
 *     The proxy is needed because Pardot does not support CORS from browsers.
 *
 * To wire up the real API in a future session:
 *   1. Set `pardotConfig.businessUnitId`, `apiProxyUrl`, and `useMockData: false`
 *      in the Settings panel → Pardot tab.
 *   2. Deploy a lightweight proxy (e.g. n8n webhook, Vercel Edge Function, or
 *      Cloudflare Worker) that forwards requests to:
 *        https://pi.pardot.com/api/v5/objects/lists/{listId}
 *      with `Authorization: Bearer <access_token>` and
 *      `Pardot-Business-Unit-Id: <businessUnitId>` headers.
 *   3. The proxy handles the OAuth 2.0 Connected App token refresh.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PardotConfig {
  /** Toggle between live API and mock data */
  useMockData: boolean
  /** Salesforce Account Engagement Business Unit ID (18-char) */
  businessUnitId: string
  /**
   * URL of your proxy that forwards to the Pardot v5 REST API.
   * Required when useMockData = false.
   * Example: https://your-worker.workers.dev/pardot
   */
  apiProxyUrl: string
  /**
   * Pardot instance URL — usually https://pi.pardot.com
   * (some EU customers use https://pi.eu.pardot.com)
   */
  instanceUrl: string
}

export interface PardotListMeta {
  id: string | number
  name: string
  /** Direct link to the list in the Pardot UI */
  pardotUrl: string
  description: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PardotListStats {
  totalProspects: number
  mailableProspects: number
  mailablePercent: number
  unmailableProspects: number
  neverActive: number
  hardBounces: number
  softBounces: number
  unsubscribed: number
  optedIn: number
  optedInPercent: number
  openRate: number
  clickRate: number
}

export interface PardotListAnalysis {
  meta: PardotListMeta
  stats: PardotListStats
  summary: string
  insights: string[]
  recommendations: string[]
  isMock: boolean
}

export type PardotFetchResult =
  | { ok: true; data: PardotListAnalysis }
  | { ok: false; error: string }

// ─── Default config ───────────────────────────────────────────────────────────

export const DEFAULT_PARDOT_CONFIG: PardotConfig = {
  useMockData: true,
  businessUnitId: '',
  apiProxyUrl: '',
  instanceUrl: 'https://pi.pardot.com',
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function fetchPardotListAnalysis(
  listIdentifier: string,
  config: PardotConfig = DEFAULT_PARDOT_CONFIG
): Promise<PardotFetchResult> {
  const trimmed = listIdentifier.trim()
  if (!trimmed) return { ok: false, error: 'No list identifier provided.' }

  // Extract numeric ID from a full Pardot URL if pasted
  const listId = extractListId(trimmed)

  if (config.useMockData || !config.businessUnitId || !config.apiProxyUrl) {
    return { ok: true, data: generateMockAnalysis(listId, trimmed) }
  }

  return fetchLiveAnalysis(listId, config)
}

// ─── Live API call (ready for future activation) ──────────────────────────────

async function fetchLiveAnalysis(
  listId: string,
  config: PardotConfig
): Promise<PardotFetchResult> {
  try {
    const url = `${config.apiProxyUrl.replace(/\/$/, '')}/lists/${encodeURIComponent(listId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Pardot-Business-Unit-Id': config.businessUnitId,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      return { ok: false, error: `Pardot API error: ${text}` }
    }

    const json = await res.json()
    return { ok: true, data: mapApiResponse(json, listId, config) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error contacting Pardot API.',
    }
  }
}

/**
 * Maps the Pardot v5 API response shape to our internal type.
 * Adjust field names here if the proxy transforms the response.
 */
function mapApiResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any,
  listId: string,
  config: PardotConfig
): PardotListAnalysis {
  const total = json.numberOfProspects ?? json.total_prospects ?? 0
  const mailable = json.numberOfMailableProspects ?? json.mailable_prospects ?? 0
  const unmailable = total - mailable
  const neverActive = json.numberOfNeverActiveProspects ?? json.never_active ?? 0
  const hardBounces = json.numberOfHardBouncedProspects ?? json.hard_bounces ?? 0
  const softBounces = json.numberOfSoftBouncedProspects ?? json.soft_bounces ?? 0
  const unsubscribed = json.numberOfUnsubscribedProspects ?? json.unsubscribed ?? 0
  const optedIn = json.numberOfOptedInProspects ?? json.opted_in ?? 0

  const mailablePercent = total > 0 ? Math.round((mailable / total) * 100) : 0
  const optedInPercent = total > 0 ? Math.round((optedIn / total) * 100) : 0
  const openRate = json.openRate ?? json.open_rate ?? 0
  const clickRate = json.clickRate ?? json.click_rate ?? 0

  const stats: PardotListStats = {
    totalProspects: total,
    mailableProspects: mailable,
    mailablePercent,
    unmailableProspects: unmailable,
    neverActive,
    hardBounces,
    softBounces,
    unsubscribed,
    optedIn,
    optedInPercent,
    openRate,
    clickRate,
  }

  return {
    meta: {
      id: listId,
      name: json.name ?? `List ${listId}`,
      pardotUrl: `${config.instanceUrl}/lists/read/id/${listId}`,
      description: json.description ?? null,
      createdAt: json.createdAt ?? null,
      updatedAt: json.updatedAt ?? null,
    },
    stats,
    ...deriveInsights(stats, json.name ?? `List ${listId}`),
    isMock: false,
  }
}

// ─── Mock data generator ──────────────────────────────────────────────────────

function generateMockAnalysis(listId: string, rawInput: string): PardotListAnalysis {
  // Seed variance so different IDs produce different-looking numbers
  const seed = listId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) % (max - min + 1)

  const total = 1500 + rand(0, 3500)
  const unsubscribed = Math.round(total * (0.06 + rand(0, 8) / 100))
  const hardBounces = Math.round(total * (0.01 + rand(0, 3) / 100))
  const softBounces = Math.round(total * (0.005 + rand(0, 2) / 100))
  const neverActive = Math.round(total * (0.05 + rand(0, 12) / 100))
  const mailable = total - unsubscribed - hardBounces
  const optedIn = Math.round(mailable * (0.55 + rand(0, 30) / 100))

  const mailablePercent = Math.round((mailable / total) * 100)
  const optedInPercent = Math.round((optedIn / total) * 100)
  const openRate = Math.round((18 + rand(0, 14)) * 10) / 10
  const clickRate = Math.round((4 + rand(0, 8)) * 10) / 10

  const listName = inferListName(rawInput, listId)

  const stats: PardotListStats = {
    totalProspects: total,
    mailableProspects: mailable,
    mailablePercent,
    unmailableProspects: total - mailable,
    neverActive,
    hardBounces,
    softBounces,
    unsubscribed,
    optedIn,
    optedInPercent,
    openRate,
    clickRate,
  }

  return {
    meta: {
      id: listId,
      name: listName,
      pardotUrl: `https://pi.pardot.com/lists/read/id/${listId}`,
      description: null,
      createdAt: null,
      updatedAt: null,
    },
    stats,
    ...deriveInsights(stats, listName),
    isMock: true,
  }
}

// ─── Insight derivation (shared by live + mock) ───────────────────────────────

function deriveInsights(
  s: PardotListStats,
  listName: string
): Pick<PardotListAnalysis, 'summary' | 'insights' | 'recommendations'> {
  const insights: string[] = []
  const recommendations: string[] = []

  // Mailable health
  if (s.mailablePercent >= 85) {
    insights.push(`Mailable rate of ${s.mailablePercent}% is healthy and above the 85% benchmark.`)
  } else if (s.mailablePercent >= 70) {
    insights.push(`Mailable rate of ${s.mailablePercent}% is acceptable but below the ideal 85% threshold.`)
    recommendations.push('Review and re-permission unsubscribed contacts where possible.')
  } else {
    insights.push(`Mailable rate of ${s.mailablePercent}% is below average — deliverability may be impacted.`)
    recommendations.push('Urgent: conduct a list hygiene exercise before sending.')
  }

  // Hard bounces
  if (s.hardBounces > 0) {
    const pct = Math.round((s.hardBounces / s.totalProspects) * 100)
    insights.push(`${s.hardBounces.toLocaleString()} hard bounce${s.hardBounces !== 1 ? 's' : ''} detected (${pct}%).`)
    if (pct >= 2) recommendations.push('Remove hard-bounced addresses before sending to protect sender reputation.')
  }

  // Never actives
  if (s.neverActive > 100) {
    const pct = Math.round((s.neverActive / s.totalProspects) * 100)
    insights.push(`${s.neverActive.toLocaleString()} never-active prospects (${pct}%) have never engaged.`)
    recommendations.push(`Consider suppressing the ${s.neverActive.toLocaleString()} never-active prospects to improve open rates and avoid spam flags.`)
  }

  // Soft bounces
  if (s.softBounces > 50) {
    insights.push(`${s.softBounces.toLocaleString()} soft bounces — these may self-resolve but should be monitored.`)
  }

  // Opt-in rate
  if (s.optedInPercent < 50) {
    insights.push(`Only ${s.optedInPercent}% of mailable prospects have explicit opt-in on record.`)
    recommendations.push('Confirm compliance with GDPR / POPIA requirements for regions where explicit consent is mandatory.')
  } else {
    insights.push(`${s.optedInPercent}% of mailable prospects have confirmed opt-in — strong consent basis.`)
  }

  if (recommendations.length === 0) {
    recommendations.push('List health looks good. No immediate action required before sending.')
  }

  const summary = `"${listName}" contains ${s.totalProspects.toLocaleString()} prospects of which ${s.mailableProspects.toLocaleString()} (${s.mailablePercent}%) are mailable. ${s.neverActive > 0 ? `${s.neverActive.toLocaleString()} have never engaged.` : ''}`

  return { summary, insights, recommendations }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Pulls a numeric/slug ID out of a Pardot URL or returns the raw string. */
function extractListId(input: string): string {
  // https://pi.pardot.com/lists/read/id/12345
  const urlMatch = input.match(/\/lists\/(?:read\/id\/|)(\d+)/i)
  if (urlMatch) return urlMatch[1]
  // Plain number
  if (/^\d+$/.test(input)) return input
  // Slug / name — use as-is
  return input
}

function inferListName(rawInput: string, listId: string): string {
  // If the input looks like a URL, derive a name from the ID
  if (rawInput.startsWith('http')) return `Pardot List #${listId}`
  // If purely numeric, show as ID
  if (/^\d+$/.test(rawInput)) return `Pardot List #${listId}`
  // Treat as a list name
  return rawInput
}
