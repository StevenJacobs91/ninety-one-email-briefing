import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export interface BenchmarkEntry {
  id: string
  teamId: string
  label: string
  emailCategory: string
  source: 'manual' | 'import' | 'litmus' | 'mailchimp' | 'other'
  periodLabel: string | null
  avgOpenRate: number | null
  avgUniqueCtr: number | null
  avgClickToOpen: number | null
  avgListGrowth: number | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface BenchmarkDelta {
  metric: string
  label: string
  ourValue: number | null
  benchmarkValue: number | null
  delta: number | null        // percentage points difference
  deltaPercent: number | null // relative % change
  direction: 'above' | 'below' | 'equal' | 'no-data'
}

// DB row shape
type BenchmarkRow = {
  id: string
  team_id: string
  label: string
  email_category: string
  source: string
  period_label: string | null
  avg_open_rate: number | null
  avg_unique_ctr: number | null
  avg_click_to_open: number | null
  avg_list_growth: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

function rowToEntry(r: BenchmarkRow): BenchmarkEntry {
  return {
    id: r.id,
    teamId: r.team_id,
    label: r.label,
    emailCategory: r.email_category,
    source: r.source as BenchmarkEntry['source'],
    periodLabel: r.period_label,
    avgOpenRate: r.avg_open_rate,
    avgUniqueCtr: r.avg_unique_ctr,
    avgClickToOpen: r.avg_click_to_open,
    avgListGrowth: r.avg_list_growth,
    notes: r.notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchBenchmarks(
  teamId: string,
  emailCategory?: string
): Promise<BenchmarkEntry[]> {
  let q = supabase
    .from('benchmark_entries')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  if (emailCategory) q = q.eq('email_category', emailCategory)
  const { data, error } = await q
  if (error) throw error
  return (data as BenchmarkRow[]).map(rowToEntry)
}

export async function upsertBenchmark(
  teamId: string,
  userId: string,
  entry: Omit<BenchmarkEntry, 'id' | 'teamId' | 'createdBy' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<BenchmarkEntry> {
  const row = {
    id: entry.id ?? uuidv4(),
    team_id: teamId,
    label: entry.label,
    email_category: entry.emailCategory,
    source: entry.source,
    period_label: entry.periodLabel,
    avg_open_rate: entry.avgOpenRate,
    avg_unique_ctr: entry.avgUniqueCtr,
    avg_click_to_open: entry.avgClickToOpen,
    avg_list_growth: entry.avgListGrowth,
    notes: entry.notes,
    created_by: userId,
  }
  const { data, error } = await supabase
    .from('benchmark_entries')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return rowToEntry(data as BenchmarkRow)
}

export async function deleteBenchmark(id: string): Promise<void> {
  const { error } = await supabase.from('benchmark_entries').delete().eq('id', id)
  if (error) throw error
}

export function computeBenchmarkDeltas(
  ourData: { avgOpenRate?: number; avgUniqueCtr?: number; avgClickToOpen?: number },
  benchmark: BenchmarkEntry
): BenchmarkDelta[] {
  function delta(
    metric: string,
    label: string,
    ours: number | undefined,
    theirs: number | null
  ): BenchmarkDelta {
    const ourValue = ours ?? null
    if (ourValue === null || theirs === null) {
      return {
        metric,
        label,
        ourValue,
        benchmarkValue: theirs,
        delta: null,
        deltaPercent: null,
        direction: 'no-data',
      }
    }
    const diff = ourValue - theirs
    const pct = theirs !== 0 ? (diff / theirs) * 100 : 0
    const direction = Math.abs(diff) < 0.001 ? 'equal' : diff > 0 ? 'above' : 'below'
    return {
      metric,
      label,
      ourValue,
      benchmarkValue: theirs,
      delta: diff,
      deltaPercent: pct,
      direction,
    }
  }

  return [
    delta('avgUniqueCtr', 'Unique CTR', ourData.avgUniqueCtr, benchmark.avgUniqueCtr),
    delta('avgOpenRate', 'Open Rate', ourData.avgOpenRate, benchmark.avgOpenRate),
    delta('avgClickToOpen', 'Click-to-Open', ourData.avgClickToOpen, benchmark.avgClickToOpen),
  ].filter((d) => d.benchmarkValue !== null)
}
