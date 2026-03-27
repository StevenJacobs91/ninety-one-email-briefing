import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload } from '../../types/brief.types'
import { runBrandGuardianReview, type BrandReview, type BrandFeedbackItem } from '../../lib/brandGuardian'
import { useSettings } from '../../contexts/SettingsContext'

interface StepBrandReviewProps {
  onAccept: () => void
  onDecline: () => void
}

const REVIEW_SECTIONS = [
  {
    id: 'brand',
    label: 'Brand Review',
    categories: ['Visual Identity', 'Brand Voice', 'Brand Protection'],
  },
  {
    id: 'content',
    label: 'Content Review',
    categories: ['Content Structure', 'Audience Alignment'],
  },
  {
    id: 'checklist',
    label: 'Compliance Checklist',
    categories: ['Compliance', 'Accessibility'],
  },
] as const

export function StepBrandReview({ onAccept, onDecline }: StepBrandReviewProps) {
  const { getValues } = useFormContext<BriefFormData>()
  const data = getValues() as BriefPayload
  const { settings } = useSettings()

  const MINIMUM_SCORE = settings.brandGuardian.minimumScore

  const review: BrandReview = useMemo(() => runBrandGuardianReview(data, {
    config: settings.brandGuardian,
    themes: settings.brandThemes,
    modules: settings.htmlModules,
  }), [data, settings.brandGuardian, settings.brandThemes, settings.htmlModules])
  const [activeTab, setActiveTab] = useState<string>('brand')

  const isBlocked = review.score < MINIMUM_SCORE

  const statusConfig = {
    approved: { label: 'Approved', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500' },
    'needs-review': { label: 'Needs Review', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-400', dot: 'bg-amber-500' },
    rejected: { label: 'Changes Required', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-400', dot: 'bg-red-500' },
  }

  const cfg = statusConfig[isBlocked ? 'rejected' : review.status]

  // Group items by review section
  const sectionItems = useMemo(() => {
    const map = new Map<string, BrandFeedbackItem[]>()
    for (const section of REVIEW_SECTIONS) {
      const cats = section.categories as readonly string[]
      const items = review.items.filter((item) =>
        cats.includes(item.category)
      )
      map.set(section.id, items)
    }
    // Catch-all for any uncategorized items
    const allCategorized = new Set<string>(REVIEW_SECTIONS.flatMap((s) => [...s.categories]))
    const uncategorized = review.items.filter((item) => !allCategorized.has(item.category))
    if (uncategorized.length > 0) {
      const existing = map.get('brand') ?? []
      map.set('brand', [...existing, ...uncategorized])
    }
    return map
  }, [review.items])

  const getSectionStats = (sectionId: string) => {
    const items = sectionItems.get(sectionId) ?? []
    const errors = items.filter((i) => i.severity === 'error').length
    const warnings = items.filter((i) => i.severity === 'warning').length
    const passes = items.filter((i) => i.severity === 'pass').length
    return { errors, warnings, passes, total: items.length }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Brand Guardian Review</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Automated brand compliance check based on Ninety One brand guidelines.
      </p>

      {/* Status banner */}
      <div className={`${cfg.bg} ${cfg.border} border rounded-lg p-4 mb-6`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
          <div>
            <p className={`text-sm font-semibold ${cfg.text}`}>
              {isBlocked ? 'Changes Required' : cfg.label}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {isBlocked
                ? `Score is ${review.score}% — a minimum of ${MINIMUM_SCORE}% is required to proceed. Please address the issues below.`
                : review.summary}
            </p>
          </div>
          <span className={`ml-auto text-2xl font-bold ${cfg.text}`}>{review.score}%</span>
        </div>
        {isBlocked && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded px-3 py-2">
            <span className="font-bold">Blocked:</span>
            <span>Brief cannot proceed until the score reaches {MINIMUM_SCORE}%. Go back and address warnings and errors.</span>
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {REVIEW_SECTIONS.map((section) => {
          const stats = getSectionStats(section.id)
          const isActive = activeTab === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-[#134848] dark:border-[#fbaa96] text-[#134848] dark:text-[#fbaa96]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {section.label}
              {stats.errors > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-[10px] font-bold">
                  {stats.errors}
                </span>
              )}
              {stats.errors === 0 && stats.warnings > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {stats.warnings}
                </span>
              )}
              {stats.errors === 0 && stats.warnings === 0 && stats.total > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-[10px] font-bold">
                  {'\u2713'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active section items grouped by category */}
      <div className="space-y-5 mb-8">
        {(() => {
          const items = sectionItems.get(activeTab) ?? []
          const grouped = items.reduce<Record<string, BrandFeedbackItem[]>>((acc, item) => {
            const cat = item.category ?? 'General'
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(item)
            return acc
          }, {})

          if (Object.keys(grouped).length === 0) {
            return (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                No items in this section.
              </p>
            )
          }

          return Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
              <div className="space-y-2">
                {categoryItems.map((item, i) => (
                  <FeedbackRow key={i} item={item} />
                ))}
              </div>
            </div>
          ))
        })()}
      </div>

      {/* Accept / Decline */}
      <div className="flex gap-3">
        {isBlocked ? (
          <button
            type="button"
            disabled
            className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 px-4 rounded-md text-sm font-medium cursor-not-allowed"
          >
            Score below {MINIMUM_SCORE}% — Cannot Proceed
          </button>
        ) : review.status !== 'rejected' ? (
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 bg-[#134848] text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#0d3232] transition-colors"
          >
            Accept &amp; Generate Email
          </button>
        ) : (
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 bg-amber-600 text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Override &amp; Proceed Anyway
          </button>
        )}
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Go Back &amp; Edit Brief
        </button>
      </div>
    </div>
  )
}

function FeedbackRow({ item }: { item: BrandFeedbackItem }) {
  const icons = {
    pass: { symbol: '\u2713', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
    warning: { symbol: '!', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    error: { symbol: '\u2717', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  }
  const icon = icons[item.severity]

  return (
    <div className={`flex items-start gap-3 p-3 rounded-md ${icon.bg}`}>
      <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${icon.color} shrink-0 mt-0.5`}>
        {icon.symbol}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.field}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{item.message}</p>
      </div>
    </div>
  )
}
