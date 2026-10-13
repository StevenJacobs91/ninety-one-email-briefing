import { supabase } from './supabase'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type SegmentType = 'region' | 'channel' | 'client_group' | 'email_type'

export interface AudienceHealthSnapshot {
  id: string
  teamId: string
  snapshotDate: string      // ISO date YYYY-MM-DD
  segmentType: SegmentType
  segmentValue: string
  delivered: number
  uniqueClicks: number
  uniqueCtr: number         // stored as percentage (e.g. 3.5 = 3.5%)
  listSize: number
  churnScore: number | null  // 0.0–1.0
  riskLevel: RiskLevel | null
  createdAt: string
}

type SnapshotRow = {
  id: string
  team_id: string
  snapshot_date: string
  segment_type: string
  segment_value: string
  delivered: number
  unique_clicks: number
  unique_ctr: number
  list_size: number
  churn_score: number | null
  risk_level: string | null
  created_at: string
}

function rowToSnapshot(r: SnapshotRow): AudienceHealthSnapshot {
  return {
    id: r.id,
    teamId: r.team_id,
    snapshotDate: r.snapshot_date,
    segmentType: r.segment_type as SegmentType,
    segmentValue: r.segment_value,
    delivered: r.delivered,
    uniqueClicks: r.unique_clicks,
    uniqueCtr: r.unique_ctr,
    listSize: r.list_size,
    churnScore: r.churn_score,
    riskLevel: r.risk_level as RiskLevel | null,
    createdAt: r.created_at,
  }
}

export async function fetchLatestSnapshots(teamId: string): Promise<AudienceHealthSnapshot[]> {
  // Get the most recent snapshot per (segmentType, segmentValue)
  const { data, error } = await supabase
    .from('audience_health_snapshots')
    .select('*')
    .eq('team_id', teamId)
    .order('snapshot_date', { ascending: false })
    .limit(200)
  if (error) throw error
  const rows = data as SnapshotRow[]

  // Deduplicate: keep only most recent per segment key
  const seen = new Set<string>()
  const latest: AudienceHealthSnapshot[] = []
  for (const row of rows) {
    const key = `${row.segment_type}:${row.segment_value}`
    if (!seen.has(key)) {
      seen.add(key)
      latest.push(rowToSnapshot(row))
    }
  }
  return latest.sort((a, b) => (b.churnScore ?? 0) - (a.churnScore ?? 0))
}

export async function fetchSnapshotHistory(
  teamId: string,
  segmentType: SegmentType,
  segmentValue: string,
  days = 90
): Promise<AudienceHealthSnapshot[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('audience_health_snapshots')
    .select('*')
    .eq('team_id', teamId)
    .eq('segment_type', segmentType)
    .eq('segment_value', segmentValue)
    .gte('snapshot_date', since.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true })
  if (error) throw error
  return (data as SnapshotRow[]).map(rowToSnapshot)
}

// ── Scoring ─────────────────────────────────────────────────

export function computeChurnScore(history: AudienceHealthSnapshot[]): {
  score: number
  riskLevel: RiskLevel
} {
  if (history.length < 2) return { score: 0, riskLevel: 'low' }

  const sorted = [...history].sort(
    (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  )

  // Baseline = average CTR of oldest 50% of history
  const midpoint = Math.floor(sorted.length / 2)
  const baseline = sorted.slice(0, midpoint)
  const recent = sorted.slice(midpoint)

  const avgBaseline =
    baseline.reduce((s, r) => s + r.uniqueCtr, 0) / (baseline.length || 1)
  const avgRecent =
    recent.reduce((s, r) => s + r.uniqueCtr, 0) / (recent.length || 1)

  if (avgBaseline === 0) return { score: 0, riskLevel: 'low' }

  // Score = how much recent has dropped relative to baseline (0 = no drop, 1 = 100% drop)
  const drop = Math.max(0, (avgBaseline - avgRecent) / avgBaseline)
  const score = Math.min(1, drop)

  const riskLevel: RiskLevel =
    score >= 0.7 ? 'critical' : score >= 0.45 ? 'high' : score >= 0.2 ? 'medium' : 'low'

  return { score: parseFloat(score.toFixed(3)), riskLevel }
}

export async function upsertSnapshot(
  params: Omit<AudienceHealthSnapshot, 'id' | 'createdAt'>
): Promise<void> {
  const row = {
    team_id: params.teamId,
    snapshot_date: params.snapshotDate,
    segment_type: params.segmentType,
    segment_value: params.segmentValue,
    delivered: params.delivered,
    unique_clicks: params.uniqueClicks,
    unique_ctr: params.uniqueCtr,
    list_size: params.listSize,
    churn_score: params.churnScore,
    risk_level: params.riskLevel,
  }
  const { error } = await supabase
    .from('audience_health_snapshots')
    .upsert(row, { onConflict: 'team_id,snapshot_date,segment_type,segment_value' })
  if (error) throw error
}
