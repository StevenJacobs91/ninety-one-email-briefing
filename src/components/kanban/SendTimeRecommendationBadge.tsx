import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getSendTimeRecommendation,
  formatSendTimeWindow,
  type SendTimeRecommendation,
} from '../../lib/sendTimeOptimiser'

interface Props {
  teamId: string
  emailType: string
  enabled: boolean
}

function ConfidenceDot({ confidence }: { confidence: 'low' | 'medium' | 'high' }) {
  const colourClass =
    confidence === 'high'
      ? 'bg-green-500'
      : confidence === 'medium'
      ? 'bg-amber-400'
      : 'bg-gray-400'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colourClass} shrink-0`} />
}

function ClockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function SendTimeRecommendationBadge({ teamId, emailType, enabled }: Props) {
  const [recommendation, setRecommendation] = useState<SendTimeRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)

    getSendTimeRecommendation(teamId, emailType)
      .then((rec) => {
        if (!cancelled) {
          setRecommendation(rec)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, emailType, enabled])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setPopoverOpen(false)
    }
  }, [])

  useEffect(() => {
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popoverOpen, handleClickOutside])

  if (!enabled) return null

  if (loading) {
    return (
      <div className="animate-pulse inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
        <div className="w-3 h-3 rounded-full bg-amber-200 dark:bg-amber-700" />
        <div className="w-16 h-2.5 rounded bg-amber-200 dark:bg-amber-700" />
      </div>
    )
  }

  if (!recommendation || recommendation.totalEvents < 3 || recommendation.top.length === 0) {
    return null
  }

  const topWindow = recommendation.top[0]

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setPopoverOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer select-none"
      >
        <ClockIcon />
        <ConfidenceDot confidence={topWindow.confidence} />
        <span>Best time: {formatSendTimeWindow(topWindow)}</span>
      </button>

      {popoverOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Top send windows
          </p>
          <ul className="space-y-2">
            {recommendation.top.map((w, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ConfidenceDot confidence={w.confidence} />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {formatSendTimeWindow(w)}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
                  {(w.avgCtr * 100).toFixed(1)}% CTR
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            Based on {recommendation.totalEvents} send{recommendation.totalEvents !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
