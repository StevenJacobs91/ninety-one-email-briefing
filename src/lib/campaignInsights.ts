/**
 * campaignInsights.ts
 *
 * Campaign engagement analytics service.
 *
 * Architecture:
 *   - `fetchCampaignInsights()` is the single public entry point.
 *   - When `useMockData === true` (default) it returns deterministic mock data
 *     seeded from the campaign name.
 *   - When real Pardot/SFMC credentials are configured, it calls the live API
 *     via the same proxy pattern used by pardotService.ts.
 *
 * Data model is designed to match the Pardot v5 email stats API shape so the
 * switch from mock→live requires only the fetch layer, not the UI.
 *
 * Future live integration path:
 *   1. Pardot v5: GET /api/v5/objects/emails?campaignId={id}&limit=5&orderBy=sentAt DESC
 *   2. Per email: GET /api/v5/objects/emails/{id}/stats  → clicks, CTR, opens
 *   3. Top prospects: GET /api/v5/objects/visitors?campaignId={id}&orderBy=score DESC&limit=10
 */

import type { PardotConfig } from './pardotService'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CampaignEmailRecord {
  /** Pardot email ID (or mock UUID) */
  id: string
  /** Email subject line as sent */
  subjectLine: string
  /** ISO 8601 date-time the email was sent */
  sentAt: string
  /** Day of week the email was sent (0=Sun..6=Sat) */
  sentDayOfWeek: number
  /** Hour of day the email was sent (0-23, in sender timezone) */
  sentHour: number
  /** Total recipients who received the email */
  delivered: number
  /** Unique opens (note: unreliable metric — see openRateCaveat) */
  uniqueOpens: number
  /** Unique open rate as percentage */
  uniqueOpenRate: number
  /** Unique clicks (distinct prospect count) */
  uniqueClicks: number
  /** Unique click-through rate — uniqueClicks / delivered × 100 */
  uniqueCtr: number
  /** Total clicks (including repeat clicks from same prospect) */
  totalClicks: number
  /** Total click-through rate — totalClicks / delivered × 100 */
  totalCtr: number
  /** Peak click hour (0-23) — when most clicks occurred */
  peakClickHour: number
  /** Top clicked URL in this send */
  topClickedUrl: string | null
}

export interface EngagedProspect {
  /** Prospect ID */
  id: string
  /** Email address (masked for privacy in mock data) */
  email: string
  /** Display name if available */
  name: string | null
  /** Prospect's Pardot score */
  score: number
  /** Number of emails opened in this campaign */
  opensInCampaign: number
  /** Number of emails clicked in this campaign */
  clicksInCampaign: number
  /** Last activity date */
  lastActivityAt: string
  /** Prospect grade (A+ to D) */
  grade: string | null
}

export interface SendTimePattern {
  /** Day of week (0=Sun..6=Sat) */
  dayOfWeek: number
  /** Day label */
  dayLabel: string
  /** Number of sends on this day */
  sendCount: number
  /** Average unique CTR for sends on this day */
  avgUniqueCtr: number
}

export interface ClickTimePattern {
  /** Hour of day (0-23) */
  hour: number
  /** Label e.g. "09:00" */
  hourLabel: string
  /** Total clicks in this hour across all sends */
  totalClicks: number
  /** Percentage of all clicks that occurred in this hour */
  clickShare: number
}

export interface CampaignTrend {
  direction: 'up' | 'down' | 'stable'
  metric: string
  description: string
  /** Percentage change (positive = improvement) */
  changePercent: number | null
}

export interface CampaignInsightsData {
  /** Campaign name */
  campaignName: string
  /** Number of emails analysed */
  emailCount: number
  /** The last N email sends, newest first */
  emails: CampaignEmailRecord[]
  /** Top engaged prospects in this campaign */
  topProspects: EngagedProspect[]
  /** Send day-of-week patterns */
  sendTimePatterns: SendTimePattern[]
  /** Click hour-of-day patterns */
  clickTimePatterns: ClickTimePattern[]
  /** Identified trends */
  trends: CampaignTrend[]
  /** AI/rules-generated insights (human-readable) */
  insights: string[]
  /** Actionable recommendations */
  recommendations: string[]
  /** Open rate caveat — always present */
  openRateCaveat: string
  /** Whether this is mock data */
  isMock: boolean
  /** Timestamp of analysis */
  analysedAt: string
}

export type CampaignInsightsResult =
  | { ok: true; data: CampaignInsightsData }
  | { ok: false; error: string }

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function fetchCampaignInsights(
  campaignName: string,
  config: PardotConfig
): Promise<CampaignInsightsResult> {
  const trimmed = campaignName.trim()
  if (!trimmed) return { ok: false, error: 'No campaign name provided.' }

  if (config.useMockData || !config.businessUnitId || !config.apiProxyUrl) {
    // Simulate network delay for realistic UX
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800))
    return { ok: true, data: generateMockInsights(trimmed) }
  }

  return fetchLiveInsights(trimmed, config)
}

// ─── Live API (stub for future activation) ───────────────────────────────────

async function fetchLiveInsights(
  campaignName: string,
  config: PardotConfig
): Promise<CampaignInsightsResult> {
  try {
    const url = `${config.apiProxyUrl.replace(/\/$/, '')}/campaigns/insights`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pardot-Business-Unit-Id': config.businessUnitId,
      },
      body: JSON.stringify({ campaignName, limit: 5 }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      return { ok: false, error: `Campaign insights API error: ${text}` }
    }

    const json = await res.json()
    return { ok: true, data: mapLiveResponse(json, campaignName) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error fetching campaign insights.',
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLiveResponse(json: any, campaignName: string): CampaignInsightsData {
  // Map the live API response to our internal types.
  // Adjust field names as needed based on your proxy's response shape.
  const emails: CampaignEmailRecord[] = (json.emails ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => ({
      id: e.id ?? '',
      subjectLine: e.subject ?? e.subjectLine ?? '',
      sentAt: e.sentAt ?? e.sent_at ?? '',
      sentDayOfWeek: new Date(e.sentAt ?? e.sent_at).getDay(),
      sentHour: new Date(e.sentAt ?? e.sent_at).getHours(),
      delivered: e.delivered ?? 0,
      uniqueOpens: e.uniqueOpens ?? e.unique_opens ?? 0,
      uniqueOpenRate: e.uniqueOpenRate ?? e.unique_open_rate ?? 0,
      uniqueClicks: e.uniqueClicks ?? e.unique_clicks ?? 0,
      uniqueCtr: e.uniqueCtr ?? e.unique_ctr ?? 0,
      totalClicks: e.totalClicks ?? e.total_clicks ?? 0,
      totalCtr: e.totalCtr ?? e.total_ctr ?? 0,
      peakClickHour: e.peakClickHour ?? 10,
      topClickedUrl: e.topClickedUrl ?? null,
    })
  )

  const topProspects: EngagedProspect[] = (json.topProspects ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      id: p.id ?? '',
      email: p.email ?? '',
      name: p.name ?? null,
      score: p.score ?? 0,
      opensInCampaign: p.opensInCampaign ?? 0,
      clicksInCampaign: p.clicksInCampaign ?? 0,
      lastActivityAt: p.lastActivityAt ?? '',
      grade: p.grade ?? null,
    })
  )

  const result = deriveAnalytics(emails, topProspects, campaignName)
  return { ...result, isMock: false }
}

// ─── Mock data generator ─────────────────────────────────────────────────────

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const MOCK_SUBJECT_TEMPLATES = [
  '{campaign} — {month} Market Update',
  'Your {month} investment outlook from Ninety One',
  '{campaign}: Key themes for {month}',
  '{month} Fund Commentary — {campaign}',
  'Ninety One | {campaign} — {month} Edition',
  '{campaign}: What\'s driving markets in {month}',
  'Investment insights: {campaign} — {month}',
  '{month} review & outlook — {campaign}',
]

const MOCK_URLS = [
  'https://ninetyone.com/insights/monthly-commentary',
  'https://ninetyone.com/funds/overview',
  'https://ninetyone.com/insights/global-outlook',
  'https://ninetyone.com/webinars/upcoming',
  'https://ninetyone.com/insights/thought-leadership',
]

const MOCK_NAMES = [
  'James Peterson', 'Sarah van der Merwe', 'Michael Chen',
  'Emma Thompson', 'David Naidoo', 'Lisa Kruger',
  'Andrew Botha', 'Priya Sharma', 'Robert Williams',
  'Hannah de Villiers',
]

function generateMockInsights(campaignName: string): CampaignInsightsData {
  const seed = campaignName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const seededRand = (min: number, max: number, offset = 0) =>
    min + (((seed + offset) * 9301 + 49297) % 233280) % (max - min + 1)

  const now = new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  // Generate 5 historical email sends (one per month going back)
  const emails: CampaignEmailRecord[] = Array.from({ length: 5 }, (_, i) => {
    const sendDate = new Date(now)
    sendDate.setMonth(sendDate.getMonth() - (i + 1))
    // Vary the day: typically Tue-Thu sends
    const dayOffset = seededRand(1, 3, i * 100) // Tue=2, Wed=3, Thu=4
    sendDate.setDate(sendDate.getDate() - sendDate.getDay() + dayOffset)

    // Vary send hour: typically 8-11am
    const sendHour = 8 + seededRand(0, 3, i * 200)
    sendDate.setHours(sendHour, 0, 0, 0)

    const monthName = months[sendDate.getMonth()]
    const subjectTemplate = MOCK_SUBJECT_TEMPLATES[seededRand(0, MOCK_SUBJECT_TEMPLATES.length - 1, i * 300)]
    const subjectLine = subjectTemplate
      .replace('{campaign}', campaignName.length > 30 ? campaignName.slice(0, 30) : campaignName)
      .replace('{month}', monthName)

    const delivered = 2000 + seededRand(0, 3000, i * 400)

    // Open rates 18-32% (with natural variation)
    const baseOpenRate = 18 + seededRand(0, 14, i * 500)
    // Slight upward trend for more recent sends
    const openTrend = Math.max(0, (4 - i) * 0.8)
    const uniqueOpenRate = Math.round((baseOpenRate + openTrend) * 10) / 10
    const uniqueOpens = Math.round(delivered * uniqueOpenRate / 100)

    // Click rates 3-9% unique CTR
    const baseClickRate = 3 + seededRand(0, 6, i * 600)
    const clickTrend = Math.max(0, (4 - i) * 0.4)
    const uniqueCtr = Math.round((baseClickRate + clickTrend) * 10) / 10
    const uniqueClicks = Math.round(delivered * uniqueCtr / 100)

    // Total clicks are 1.3-2.1x unique clicks
    const clickMultiplier = 1.3 + seededRand(0, 8, i * 700) / 10
    const totalClicks = Math.round(uniqueClicks * clickMultiplier)
    const totalCtr = Math.round((totalClicks / delivered) * 1000) / 10

    const peakClickHour = sendHour + 1 + seededRand(0, 3, i * 800)

    return {
      id: `mock-email-${seed}-${i}`,
      subjectLine,
      sentAt: sendDate.toISOString(),
      sentDayOfWeek: sendDate.getDay(),
      sentHour: sendHour,
      delivered,
      uniqueOpens,
      uniqueOpenRate,
      uniqueClicks,
      uniqueCtr,
      totalClicks,
      totalCtr,
      peakClickHour: Math.min(peakClickHour, 17),
      topClickedUrl: MOCK_URLS[seededRand(0, MOCK_URLS.length - 1, i * 900)],
    }
  })

  // Top engaged prospects (8-10)
  const prospectCount = 8 + seededRand(0, 2, 1000)
  const topProspects: EngagedProspect[] = Array.from({ length: prospectCount }, (_, i) => {
    const name = MOCK_NAMES[i % MOCK_NAMES.length]
    const nameParts = name.toLowerCase().split(' ')
    const emailDomain = seededRand(0, 1, i * 1100) === 0
      ? 'investmentfirm.co.za'
      : seededRand(0, 1, i * 1200) === 0
        ? 'wealthgroup.com'
        : 'advisors.co.uk'

    const lastActive = new Date(now)
    lastActive.setDate(lastActive.getDate() - seededRand(1, 30, i * 1300))

    const grades = ['A+', 'A', 'A', 'A-', 'B+', 'B+', 'B', 'B', 'B-', 'C+']

    return {
      id: `mock-prospect-${seed}-${i}`,
      email: `${nameParts[0][0]}${nameParts[nameParts.length - 1]}@${emailDomain}`,
      name,
      score: 200 - i * seededRand(8, 18, i * 1400),
      opensInCampaign: 5 - Math.min(i, 3),
      clicksInCampaign: Math.max(1, 5 - i - seededRand(0, 1, i * 1500)),
      lastActivityAt: lastActive.toISOString(),
      grade: grades[Math.min(i, grades.length - 1)],
    }
  })

  return deriveAnalytics(emails, topProspects, campaignName)
}

// ─── Analytics derivation (shared by mock + live) ────────────────────────────

function deriveAnalytics(
  emails: CampaignEmailRecord[],
  topProspects: EngagedProspect[],
  campaignName: string
): CampaignInsightsData {
  // Send time patterns — aggregate by day of week
  const dayMap = new Map<number, { sends: number; ctrSum: number }>()
  for (const e of emails) {
    const existing = dayMap.get(e.sentDayOfWeek) ?? { sends: 0, ctrSum: 0 }
    dayMap.set(e.sentDayOfWeek, {
      sends: existing.sends + 1,
      ctrSum: existing.ctrSum + e.uniqueCtr,
    })
  }
  const sendTimePatterns: SendTimePattern[] = Array.from(dayMap.entries())
    .map(([day, data]) => ({
      dayOfWeek: day,
      dayLabel: DAY_LABELS[day],
      sendCount: data.sends,
      avgUniqueCtr: Math.round((data.ctrSum / data.sends) * 10) / 10,
    }))
    .sort((a, b) => b.avgUniqueCtr - a.avgUniqueCtr)

  // Click time patterns — aggregate peak click hours
  const hourMap = new Map<number, number>()
  const totalAllClicks = emails.reduce((sum, e) => sum + e.totalClicks, 0)
  for (const e of emails) {
    // Distribute clicks around peak hour with a simple bell
    for (let offset = -2; offset <= 2; offset++) {
      const h = Math.max(0, Math.min(23, e.peakClickHour + offset))
      const weight = offset === 0 ? 0.4 : Math.abs(offset) === 1 ? 0.2 : 0.1
      const clicks = Math.round(e.totalClicks * weight)
      hourMap.set(h, (hourMap.get(h) ?? 0) + clicks)
    }
  }
  const clickTimePatterns: ClickTimePattern[] = Array.from(hourMap.entries())
    .map(([hour, clicks]) => ({
      hour,
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      totalClicks: clicks,
      clickShare: totalAllClicks > 0 ? Math.round((clicks / totalAllClicks) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 8) // top 8 hours

  // Trends — compare first half vs second half of sends
  const trends: CampaignTrend[] = []
  if (emails.length >= 3) {
    const recent = emails.slice(0, Math.ceil(emails.length / 2))
    const older = emails.slice(Math.ceil(emails.length / 2))

    const avgRecentCtr = recent.reduce((s, e) => s + e.uniqueCtr, 0) / recent.length
    const avgOlderCtr = older.reduce((s, e) => s + e.uniqueCtr, 0) / older.length
    const ctrChange = avgOlderCtr > 0 ? Math.round(((avgRecentCtr - avgOlderCtr) / avgOlderCtr) * 1000) / 10 : 0

    trends.push({
      direction: ctrChange > 2 ? 'up' : ctrChange < -2 ? 'down' : 'stable',
      metric: 'Unique Click-through Rate',
      description: ctrChange > 2
        ? `Unique CTR has improved by ${Math.abs(ctrChange)}% in recent sends compared to earlier sends.`
        : ctrChange < -2
          ? `Unique CTR has declined by ${Math.abs(ctrChange)}% in recent sends. Consider refreshing subject line strategy.`
          : 'Unique CTR has remained stable across recent sends.',
      changePercent: ctrChange,
    })

    const avgRecentClicks = recent.reduce((s, e) => s + e.uniqueClicks, 0) / recent.length
    const avgOlderClicks = older.reduce((s, e) => s + e.uniqueClicks, 0) / older.length
    const clickChange = avgOlderClicks > 0 ? Math.round(((avgRecentClicks - avgOlderClicks) / avgOlderClicks) * 1000) / 10 : 0

    trends.push({
      direction: clickChange > 5 ? 'up' : clickChange < -5 ? 'down' : 'stable',
      metric: 'Unique Clicks',
      description: clickChange > 5
        ? `Unique click volume has grown by ${Math.abs(clickChange)}% — content resonance is improving.`
        : clickChange < -5
          ? `Unique click volume has dropped by ${Math.abs(clickChange)}% — review content relevance and CTA placement.`
          : 'Unique click volume has held steady.',
      changePercent: clickChange,
    })

    const avgRecentDelivered = recent.reduce((s, e) => s + e.delivered, 0) / recent.length
    const avgOlderDelivered = older.reduce((s, e) => s + e.delivered, 0) / older.length
    const listChange = avgOlderDelivered > 0 ? Math.round(((avgRecentDelivered - avgOlderDelivered) / avgOlderDelivered) * 1000) / 10 : 0

    trends.push({
      direction: listChange > 3 ? 'up' : listChange < -3 ? 'down' : 'stable',
      metric: 'List Size',
      description: listChange > 3
        ? `Delivery volume has grown by ${Math.abs(listChange)}% — audience is expanding.`
        : listChange < -3
          ? `Delivery volume has shrunk by ${Math.abs(listChange)}% — review list health and acquisition.`
          : 'Delivery volume has remained consistent.',
      changePercent: listChange,
    })
  }

  // Derive insights
  const insights: string[] = []
  const recommendations: string[] = []

  // Subject line analysis
  const avgSubjectLength = emails.reduce((s, e) => s + e.subjectLine.length, 0) / emails.length
  if (avgSubjectLength > 55) {
    insights.push(`Average subject line length is ${Math.round(avgSubjectLength)} characters — this may be truncated on mobile devices.`)
    recommendations.push('Aim for subject lines under 50 characters for optimal mobile display.')
  } else {
    insights.push(`Average subject line length of ${Math.round(avgSubjectLength)} characters is within the optimal range for mobile.`)
  }

  // Best performing email
  const bestEmail = [...emails].sort((a, b) => b.uniqueCtr - a.uniqueCtr)[0]
  if (bestEmail) {
    insights.push(`Best performing send achieved ${bestEmail.uniqueCtr}% unique CTR with "${bestEmail.subjectLine.slice(0, 50)}${bestEmail.subjectLine.length > 50 ? '...' : ''}".`)
  }

  // Worst performing email
  const worstEmail = [...emails].sort((a, b) => a.uniqueCtr - b.uniqueCtr)[0]
  if (worstEmail && bestEmail && worstEmail.id !== bestEmail.id) {
    const gap = bestEmail.uniqueCtr - worstEmail.uniqueCtr
    if (gap > 2) {
      insights.push(`Performance gap of ${gap.toFixed(1)}pp between best and worst sends suggests subject line and content variation has significant impact.`)
    }
  }

  // Send time insight
  if (sendTimePatterns.length > 0) {
    const bestDay = sendTimePatterns[0]
    insights.push(`${bestDay.dayLabel} sends have the highest average unique CTR at ${bestDay.avgUniqueCtr}%.`)
    if (bestDay.avgUniqueCtr > 5) {
      recommendations.push(`Consider scheduling more sends on ${bestDay.dayLabel}s based on historical engagement data.`)
    }
  }

  // Click time insight
  if (clickTimePatterns.length > 0) {
    const peakHour = clickTimePatterns[0]
    insights.push(`Peak engagement window is ${peakHour.hourLabel} with ${peakHour.clickShare}% of all clicks.`)
    recommendations.push(`Optimise send timing so emails arrive 1-2 hours before the ${peakHour.hourLabel} peak engagement window.`)
  }

  // Top prospect insight
  if (topProspects.length > 0) {
    const topClicker = topProspects[0]
    insights.push(`Top engaged prospect (${topClicker.name ?? topClicker.email}) has clicked ${topClicker.clicksInCampaign} emails in this campaign with a score of ${topClicker.score}.`)
    if (topProspects.filter(p => p.clicksInCampaign >= 3).length >= 3) {
      recommendations.push('Multiple prospects show consistent engagement — consider a targeted follow-up or event invitation for this high-intent cohort.')
    }
  }

  // Repeat click ratio
  const avgRepeatRatio = emails.reduce((s, e) => s + (e.uniqueClicks > 0 ? e.totalClicks / e.uniqueClicks : 1), 0) / emails.length
  if (avgRepeatRatio > 1.5) {
    insights.push(`Average repeat-click ratio of ${avgRepeatRatio.toFixed(1)}x suggests content drives multiple revisits per prospect.`)
  }

  if (recommendations.length === 0) {
    recommendations.push('Campaign engagement metrics are healthy. Continue the current strategy and monitor for changes.')
  }

  return {
    campaignName,
    emailCount: emails.length,
    emails,
    topProspects,
    sendTimePatterns,
    clickTimePatterns,
    trends,
    insights,
    recommendations,
    openRateCaveat: 'Open rates are shown for reference only. Due to Apple Mail Privacy Protection, email proxy services, and corporate firewalls that auto-load tracking pixels, open rate data is increasingly unreliable and should not be used as a primary engagement metric. Unique clicks and click-through rates are the recommended engagement indicators.',
    isMock: true,
    analysedAt: new Date().toISOString(),
  }
}
