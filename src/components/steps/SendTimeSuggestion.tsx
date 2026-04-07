import { useState, useEffect } from 'react'
import {
  getSendTimeRecommendation,
  formatSendTimeWindow,
  type SendTimeRecommendation,
} from '../../lib/sendTimeOptimiser'

interface Props {
  teamId: string
  emailType: string
  enabled: boolean
  onApply: (isoDate: string) => void
}

function nextOccurrence(dayOfWeek: number, hourOfDay: number): string {
  const now = new Date()
  const todayDay = now.getDay()
  let daysAhead = dayOfWeek - todayDay
  if (daysAhead < 0) daysAhead += 7
  // If same day but past the target hour, push to next week
  if (daysAhead === 0 && now.getHours() >= hourOfDay) daysAhead = 7

  const target = new Date(now)
  target.setDate(now.getDate() + daysAhead)
  target.setHours(hourOfDay, 0, 0, 0)
  return target.toISOString()
}

function LightbulbIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 mt-0.5"
      aria-hidden="true"
    >
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  )
}

export function SendTimeSuggestion({ teamId, emailType, enabled, onApply }: Props) {
  const [recommendation, setRecommendation] = useState<SendTimeRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed state when email type changes
  useEffect(() => {
    setDismissed(false)
  }, [emailType])

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

  if (!enabled) return null
  if (loading) return null
  if (!recommendation || recommendation.totalEvents < 3 || recommendation.top.length === 0) {
    return null
  }
  if (dismissed) return null

  const topWindow = recommendation.top[0]
  const ctrPercent = (topWindow.avgCtr * 100).toFixed(1)

  function handleApply() {
    const iso = nextOccurrence(topWindow.dayOfWeek, topWindow.hourOfDay)
    onApply(iso)
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-amber-600 dark:text-amber-400">
          <LightbulbIcon />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
            Send Time Suggestion
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Based on {recommendation.totalEvents} send
            {recommendation.totalEvents !== 1 ? 's' : ''},{' '}
            <strong>{formatSendTimeWindow(topWindow)}</strong> gets your best engagement
            (avg CTR: {ctrPercent}%).
          </p>
          <div className="flex items-center gap-4 mt-3">
            <button
              type="button"
              onClick={handleApply}
              className="text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-200 dark:bg-amber-700/50 hover:bg-amber-300 dark:hover:bg-amber-700 px-3 py-1.5 rounded-md transition-colors"
            >
              Apply suggestion
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 underline transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
