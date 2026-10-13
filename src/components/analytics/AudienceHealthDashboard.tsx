import { useEffect, useRef, useState } from 'react'
import type { AudienceHealthSnapshot, RiskLevel } from '../../lib/audienceHealthService'
import { fetchLatestSnapshots } from '../../lib/audienceHealthService'
import { SegmentRiskTable } from './SegmentRiskTable'
import { RiskBadge } from './RiskBadge'

interface AudienceHealthDashboardProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
}

type RiskCounts = Record<RiskLevel, number>

const RECOMMENDATION: Record<RiskLevel, string> = {
  critical: 'Immediate re-engagement campaign recommended. Consider reviewing content strategy for this segment.',
  high:     'Schedule a targeted re-engagement send for this segment within 2 weeks.',
  medium:   'Monitor this segment closely. Consider a content refresh.',
  low:      'This segment is healthy. Continue current strategy.',
}

function countByRisk(snapshots: AudienceHealthSnapshot[]): RiskCounts {
  const counts: RiskCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const s of snapshots) {
    if (s.riskLevel) counts[s.riskLevel]++
  }
  return counts
}

const STAT_CARDS: { level: RiskLevel; label: string; bg: string; text: string }[] = [
  { level: 'critical', label: 'Critical', bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-400' },
  { level: 'high',     label: 'High',     bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400' },
  { level: 'medium',   label: 'Medium',   bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-400' },
  { level: 'low',      label: 'Low',      bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-400' },
]

function SkeletonRows() {
  return (
    <div className="space-y-2 px-4 py-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14" />
        </div>
      ))}
    </div>
  )
}

export function AudienceHealthDashboard({ isOpen, onClose, teamId }: AudienceHealthDashboardProps) {
  const [snapshots, setSnapshots] = useState<AudienceHealthSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<AudienceHealthSnapshot | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLatestSnapshots(teamId)
      setSnapshots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audience health data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void load()
      setSelected(null)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const counts = countByRisk(snapshots)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Audience Health"
        className="fixed inset-y-0 right-0 w-full max-w-2xl z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">
              Predictive Analytics
            </p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg">
              Audience Health
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none"
              aria-label="Refresh"
              title="Refresh"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? 'animate-spin' : ''}
                aria-hidden="true"
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* Summary stat cards */}
            {!loading && !error && snapshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STAT_CARDS.map(({ level, label, bg, text }) => (
                  <div
                    key={level}
                    className={['rounded-xl px-4 py-3', bg].join(' ')}
                  >
                    <p className={['text-2xl font-bold tabular-nums', text].join(' ')}>
                      {counts[level]}
                    </p>
                    <p className={['text-xs font-medium mt-0.5', text].join(' ')}>
                      {label} Risk
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Refresh info */}
            <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 mt-0.5 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
                Snapshots are updated when briefs are moved to Distributed on the Kanban board, or can be triggered manually.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="shrink-0 text-xs font-medium text-brand-primary dark:text-brand-accent hover:underline disabled:opacity-50"
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* Error state */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-4 flex items-start gap-3">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="shrink-0 mt-0.5 text-red-500"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Failed to load data
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="shrink-0 text-xs font-medium text-red-700 dark:text-red-400 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Table */}
            {loading && !error ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <SkeletonRows />
              </div>
            ) : !error ? (
              <SegmentRiskTable
                snapshots={snapshots}
                teamId={teamId}
                onSelectSegment={setSelected}
              />
            ) : null}

            {/* Detail panel for selected segment */}
            {selected && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
                {/* Heading row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                      {selected.segmentValue
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {selected.segmentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={selected.riskLevel} size="md" />
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      aria-label="Close detail"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* CTR note */}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current CTR:{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selected.uniqueCtr.toFixed(1)}%
                  </span>
                  {' '}across{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selected.delivered.toLocaleString()}
                  </span>{' '}
                  delivered emails.
                </p>

                {/* Churn score progress bar */}
                {selected.churnScore !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Churn Risk Score
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                        {(selected.churnScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          selected.riskLevel === 'critical' ? 'bg-red-500' :
                          selected.riskLevel === 'high'     ? 'bg-orange-500' :
                          selected.riskLevel === 'medium'   ? 'bg-amber-400' :
                          'bg-green-500'
                        ].join(' ')}
                        style={{ width: `${Math.round(selected.churnScore * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                {selected.riskLevel && (
                  <div className={[
                    'rounded-lg px-4 py-3 text-sm',
                    selected.riskLevel === 'critical' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                    selected.riskLevel === 'high'     ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' :
                    selected.riskLevel === 'medium'   ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  ].join(' ')}>
                    {RECOMMENDATION[selected.riskLevel]}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
