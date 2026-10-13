import { useState, useEffect } from 'react'
import {
  fetchBenchmarks,
  computeBenchmarkDeltas,
  type BenchmarkEntry,
} from '../../lib/benchmarkService'
import { BenchmarkDeltaBadge } from './BenchmarkDeltaBadge'

interface BenchmarkComparisonPanelProps {
  teamId: string
  emailType: string
  ourData: {
    avgOpenRate?: number
    avgUniqueCtr?: number
    avgClickToOpen?: number
  }
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg
        className="w-5 h-5 animate-spin text-gray-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    </div>
  )
}

function benchmarkOptionLabel(entry: BenchmarkEntry): string {
  return entry.periodLabel
    ? `${entry.label} — ${entry.periodLabel}`
    : entry.label
}

export function BenchmarkComparisonPanel({
  teamId,
  emailType,
  ourData,
}: BenchmarkComparisonPanelProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [benchmarks, setBenchmarks] = useState<BenchmarkEntry[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchBenchmarks(teamId, emailType)
      .then((entries) => {
        if (cancelled) return
        setBenchmarks(entries)
        if (entries.length > 0) setSelectedId(entries[0].id)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load benchmarks.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, emailType])

  if (loading) return <Spinner />

  if (error) {
    return (
      <p className="text-xs text-red-600 dark:text-red-400 py-4">{error}</p>
    )
  }

  if (benchmarks.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 py-4 italic">
        No benchmarks configured for this email type. Add benchmarks in{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Settings &rarr; Benchmarks
        </span>
        .
      </p>
    )
  }

  const selected = benchmarks.find((b) => b.id === selectedId) ?? benchmarks[0]
  const deltas = computeBenchmarkDeltas(ourData, selected)

  function formatPct(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—'
    return `${value.toFixed(1)}%`
  }

  const SOURCE_LABELS: Record<BenchmarkEntry['source'], string> = {
    manual: 'Manual entry',
    import: 'Imported',
    litmus: 'Litmus',
    mailchimp: 'Mailchimp',
    other: 'Other',
  }

  return (
    <div className="space-y-4">
      {/* Benchmark selector */}
      {benchmarks.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Compare against
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          >
            {benchmarks.map((b) => (
              <option key={b.id} value={b.id}>
                {benchmarkOptionLabel(b)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comparison table */}
      {deltas.length > 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/3">
                  Metric
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/4">
                  Your Result
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/4">
                  Benchmark
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/4">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {deltas.map((d) => (
                <tr
                  key={d.metric}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {d.label}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatPct(d.ourValue)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right text-gray-500 dark:text-gray-400 tabular-nums">
                    {formatPct(d.benchmarkValue)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <BenchmarkDeltaBadge
                      direction={d.direction}
                      delta={d.delta}
                      deltaPercent={d.deltaPercent}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
          No comparable metrics available for this benchmark.
        </p>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Source:{' '}
        <span className="font-medium">{SOURCE_LABELS[selected.source]}</span>
        {selected.periodLabel && (
          <> &mdash; {selected.periodLabel}</>
        )}
      </p>

      {/* Reliability note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        Based on your campaign data. Sample size affects reliability.
      </p>
    </div>
  )
}
