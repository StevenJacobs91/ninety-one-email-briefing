import { useState } from 'react'
import type { AudienceHealthSnapshot, SegmentType } from '../../lib/audienceHealthService'
import { RiskBadge } from './RiskBadge'

interface SegmentRiskTableProps {
  snapshots: AudienceHealthSnapshot[]
  teamId: string
  onSelectSegment?: (s: AudienceHealthSnapshot) => void
}

type FilterType = 'all' | SegmentType

const FILTER_TABS: { id: FilterType; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'region',       label: 'Region' },
  { id: 'channel',      label: 'Channel' },
  { id: 'client_group', label: 'Client Group' },
  { id: 'email_type',   label: 'Email Type' },
]

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function riskBarColor(level: string | null): string {
  switch (level) {
    case 'critical': return 'bg-red-500'
    case 'high':     return 'bg-orange-500'
    case 'medium':   return 'bg-amber-400'
    case 'low':      return 'bg-green-500'
    default:         return 'bg-gray-300'
  }
}

export function SegmentRiskTable({ snapshots, onSelectSegment }: SegmentRiskTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const filtered =
    activeFilter === 'all'
      ? snapshots
      : snapshots.filter((s) => s.segmentType === activeFilter)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={[
              'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
              activeFilter === tab.id
                ? 'bg-brand-primary text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No audience health data yet. Data will appear after snapshots are generated.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  Segment
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  Type
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  CTR
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  Churn Score
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  Risk
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2.5 whitespace-nowrap">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  onClick={() => onSelectSegment?.(snapshot)}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  {/* Segment */}
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                    {toTitleCase(snapshot.segmentValue)}
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {toTitleCase(snapshot.segmentType)}
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {snapshot.uniqueCtr.toFixed(1)}%
                  </td>

                  {/* Churn Score */}
                  <td className="px-4 py-3">
                    {snapshot.churnScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={['h-full rounded-full transition-all', riskBarColor(snapshot.riskLevel)].join(' ')}
                            style={{ width: `${Math.round(snapshot.churnScore * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                          {(snapshot.churnScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">&mdash;</span>
                    )}
                  </td>

                  {/* Risk */}
                  <td className="px-4 py-3">
                    <RiskBadge level={snapshot.riskLevel} size="sm" />
                  </td>

                  {/* Trend — TODO: fetch per-segment history to render ChurnSparkline */}
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-600">
                    &mdash;
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
