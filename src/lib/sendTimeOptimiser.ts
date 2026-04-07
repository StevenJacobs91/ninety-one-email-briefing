import { supabase } from './supabase'

export interface SendTimeEvent {
  id: string
  teamId: string
  briefId: string
  campaignName: string
  emailType: string
  sentAt: string
  dayOfWeek: number   // 0=Sun … 6=Sat
  hourOfDay: number   // 0-23
  delivered: number
  uniqueClicks: number
  uniqueCtr: number
  createdAt: string
}

export interface SendTimeWindow {
  dayOfWeek: number
  hourOfDay: number
  avgCtr: number        // weighted average CTR for this cell
  sampleCount: number
  confidence: 'low' | 'medium' | 'high'
}

export interface SendTimeRecommendation {
  top: SendTimeWindow[]           // top 3 windows, ranked by avgCtr
  totalEvents: number
  emailType: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatSendTimeWindow(w: SendTimeWindow): string {
  const hour = w.hourOfDay
  const ampm = hour >= 12 ? 'pm' : 'am'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${DAY_NAMES[w.dayOfWeek]} ${h12}:00${ampm}`
}

// ── DB helpers ──────────────────────────────────────────────

type SendTimeRow = {
  id: string
  team_id: string
  brief_id: string
  campaign_name: string
  email_type: string
  sent_at: string
  day_of_week: number
  hour_of_day: number
  delivered: number
  unique_clicks: number
  unique_ctr: number
  created_at: string
}

function rowToEvent(r: SendTimeRow): SendTimeEvent {
  return {
    id: r.id,
    teamId: r.team_id,
    briefId: r.brief_id,
    campaignName: r.campaign_name,
    emailType: r.email_type,
    sentAt: r.sent_at,
    dayOfWeek: r.day_of_week,
    hourOfDay: r.hour_of_day,
    delivered: r.delivered,
    uniqueClicks: r.unique_clicks,
    uniqueCtr: r.unique_ctr,
    createdAt: r.created_at,
  }
}

export async function fetchSendTimeEvents(
  teamId: string,
  emailType?: string
): Promise<SendTimeEvent[]> {
  let q = supabase
    .from('send_time_events')
    .select('*')
    .eq('team_id', teamId)
    .order('sent_at', { ascending: false })
    .limit(500)
  if (emailType) q = q.eq('email_type', emailType)
  const { data, error } = await q
  if (error) throw error
  return (data as SendTimeRow[]).map(rowToEvent)
}

export async function recordSendEvent(params: {
  teamId: string
  briefId: string
  campaignName: string
  emailType: string
  sentAt: string
}): Promise<void> {
  const d = new Date(params.sentAt)
  const row = {
    team_id: params.teamId,
    brief_id: params.briefId,
    campaign_name: params.campaignName,
    email_type: params.emailType,
    sent_at: params.sentAt,
    day_of_week: d.getDay(),
    hour_of_day: d.getHours(),
    delivered: 0,
    unique_clicks: 0,
    unique_ctr: 0,
  }
  const { error } = await supabase.from('send_time_events').insert(row)
  if (error) throw error
}

// ── Scoring ─────────────────────────────────────────────────

const LAPLACE = 0.1  // smoothing constant

export function computeOptimalSendWindow(
  events: SendTimeEvent[]
): SendTimeRecommendation | null {
  if (events.length === 0) return null

  // Accumulate sum of CTR and count per (day, hour) cell
  const grid: Record<string, { sum: number; count: number }> = {}

  for (const e of events) {
    if (e.delivered === 0) continue
    const key = `${e.dayOfWeek}:${e.hourOfDay}`
    if (!grid[key]) grid[key] = { sum: 0, count: 0 }
    grid[key].sum += e.uniqueCtr
    grid[key].count += 1
  }

  const maxCount = Math.max(...Object.values(grid).map((v) => v.count), 1)

  const windows: SendTimeWindow[] = Object.entries(grid).map(([key, { sum, count }]) => {
    const [day, hour] = key.split(':').map(Number)
    const avgCtr = (sum + LAPLACE) / (count + LAPLACE)
    const confidence: SendTimeWindow['confidence'] =
      count >= 10 ? 'high' : count >= 3 ? 'medium' : 'low'
    return { dayOfWeek: day, hourOfDay: hour, avgCtr, sampleCount: count, confidence }
  })

  windows.sort((a, b) => b.avgCtr - a.avgCtr)
  void maxCount

  return {
    top: windows.slice(0, 3),
    totalEvents: events.length,
    emailType: events[0]?.emailType ?? '',
  }
}

export async function getSendTimeRecommendation(
  teamId: string,
  emailType: string
): Promise<SendTimeRecommendation | null> {
  // Try email-type-specific first, fall back to all types
  let events = await fetchSendTimeEvents(teamId, emailType)
  if (events.length < 5) {
    events = await fetchSendTimeEvents(teamId)
  }
  return computeOptimalSendWindow(events)
}
