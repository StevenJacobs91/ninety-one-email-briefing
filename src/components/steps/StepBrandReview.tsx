import { useMemo, useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import type { BriefPayload } from '../../types/brief.types'
import { runBrandGuardianReview, type BrandReview, type BrandFeedbackItem } from '../../lib/brandGuardian'
import { useSettings } from '../../contexts/SettingsContext'
import { useAIBrandGuardian } from '../../hooks/useAIBrandGuardian'

interface StepBrandReviewProps {
  onAccept: () => void
  onDecline: () => void
  onGoToStep: (step: number) => void
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

// Map field prefixes to step indices
const FIELD_TO_STEP: Array<[string, number]> = [
  ['campaign', 0],
  ['audience', 0],
  ['assets', 0],
  ['deadlines', 0],
  ['content', 1],
]

function fieldToStep(field: string): number | null {
  for (const [prefix, step] of FIELD_TO_STEP) {
    if (field.startsWith(prefix)) return step
  }
  return null
}

export function StepBrandReview({ onAccept, onDecline, onGoToStep }: StepBrandReviewProps) {
  const { getValues } = useFormContext<BriefFormData>()
  const data = getValues() as BriefPayload
  const { settings } = useSettings()
  const guardianConfig = settings.brandGuardian
  const aiMode = guardianConfig.aiGuardian.mode

  const MINIMUM_SCORE = guardianConfig.minimumScore

  // Static review — always runs
  const review: BrandReview = useMemo(() => runBrandGuardianReview(data, {
    config: guardianConfig,
    themes: settings.brandThemes,
    modules: settings.htmlModules,
  }), [data, guardianConfig, settings.brandThemes, settings.htmlModules])

  // AI review
  const ai = useAIBrandGuardian(guardianConfig)
  const [activeTab, setActiveTab] = useState<string>('brand')
  const [viewMode, setViewMode] = useState<'static' | 'ai'>('static')

  // Auto-run AI review in pre-submission or post-submission mode
  useEffect(() => {
    if ((aiMode === 'pre-submission' || aiMode === 'post-submission') && ai.isAvailable && ai.status === 'idle') {
      ai.run(data)
    }
  }, [aiMode, ai.isAvailable]) // eslint-disable-line react-hooks/exhaustive-deps

  const isStaticBlocked = review.score < MINIMUM_SCORE
  const isAIBlocked = aiMode === 'pre-submission' && ai.status === 'success' && ai.review && ai.review.status === 'rejected'
  const isAIRunning = ai.status === 'running'
  const isBlocked = isStaticBlocked || isAIBlocked || (aiMode === 'pre-submission' && ai.status !== 'success')

  const statusConfig = {
    approved: { label: 'Approved', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500' },
    'needs-review': { label: 'Needs Review', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-400', dot: 'bg-amber-500' },
    rejected: { label: 'Changes Required', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-400', dot: 'bg-red-500' },
  }

  const cfg = statusConfig[isStaticBlocked ? 'rejected' : review.status]

  // Group items by review section
  const sectionItems = useMemo(() => {
    const sourceItems = viewMode === 'ai' && ai.review ? ai.review.items : review.items
    const map = new Map<string, BrandFeedbackItem[]>()
    for (const section of REVIEW_SECTIONS) {
      const cats = section.categories as readonly string[]
      const items = sourceItems.filter((item) =>
        cats.includes(item.category)
      )
      map.set(section.id, items)
    }
    const allCategorized = new Set<string>(REVIEW_SECTIONS.flatMap((s) => [...s.categories]))
    const uncategorized = sourceItems.filter((item) => !allCategorized.has(item.category))
    if (uncategorized.length > 0) {
      const existing = map.get('brand') ?? []
      map.set('brand', [...existing, ...uncategorized])
    }
    return map
  }, [review.items, ai.review, viewMode])

  const getSectionStats = (sectionId: string) => {
    const items = sectionItems.get(sectionId) ?? []
    const errors = items.filter((i) => i.severity === 'error').length
    const warnings = items.filter((i) => i.severity === 'warning').length
    const passes = items.filter((i) => i.severity === 'pass').length
    return { errors, warnings, passes, total: items.length }
  }

  const activeReview = viewMode === 'ai' && ai.review ? ai.review : review

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-1">Brand Guardian Review</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Automated brand compliance check based on Ninety One brand guidelines.
      </p>

      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('static')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'static'
                ? 'bg-brand-primary text-white dark:bg-brand-accent dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Rules-Based
          </button>
          {ai.isAvailable && (
            <button
              type="button"
              onClick={() => {
                setViewMode('ai')
                if (ai.status === 'idle') ai.run(data)
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'ai'
                  ? 'bg-purple-600 text-white dark:bg-purple-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-[10px] font-bold flex items-center justify-center">AI</span>
              AI Review
            </button>
          )}
        </div>
        {viewMode === 'ai' && ai.status === 'success' && ai.review && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {ai.review.model.replace('claude-', '').split('-').slice(0, 2).join(' ')} &middot; {(ai.review.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* AI loading state */}
      {viewMode === 'ai' && ai.status === 'running' && (
        <div className="border border-purple-200 dark:border-purple-800/50 rounded-lg p-6 mb-6 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">AI Brand Guardian is analysing your brief...</p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">This typically takes 5-15 seconds depending on the model.</p>
        </div>
      )}

      {/* AI error state */}
      {viewMode === 'ai' && ai.status === 'error' && ai.error && (
        <div className="border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">AI Review Failed</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{ai.error.message}</p>
          <button
            type="button"
            onClick={() => ai.run(data)}
            className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status banner — show for active review */}
      {(viewMode === 'static' || (viewMode === 'ai' && ai.status === 'success')) && (
        <div className={viewMode === 'ai' ? 'border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 mb-6' : `${cfg.bg} ${cfg.border} border rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${
              viewMode === 'ai'
                ? activeReview.status === 'approved' ? 'bg-green-500' : activeReview.status === 'needs-review' ? 'bg-amber-500' : 'bg-red-500'
                : cfg.dot
            }`} />
            <div>
              <p className={`text-sm font-semibold ${
                viewMode === 'ai' ? 'text-purple-800 dark:text-purple-300' : cfg.text
              }`}>
                {viewMode === 'ai' ? `AI: ${statusConfig[activeReview.status].label}` : isStaticBlocked ? 'Changes Required' : cfg.label}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {viewMode === 'static' && isStaticBlocked
                  ? `Score is ${review.score}% — a minimum of ${MINIMUM_SCORE}% is required to proceed. Please address the issues below.`
                  : activeReview.summary}
              </p>
            </div>
            <span className={`ml-auto text-2xl font-bold ${
              viewMode === 'ai' ? 'text-purple-700 dark:text-purple-300' : cfg.text
            }`}>{activeReview.score}%</span>
          </div>
          {viewMode === 'static' && isStaticBlocked && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded px-3 py-2">
              <span className="font-bold">Blocked:</span>
              <span>Brief cannot proceed until the score reaches {MINIMUM_SCORE}%. Go back and address warnings and errors.</span>
            </div>
          )}
          {viewMode === 'ai' && isAIBlocked && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded px-3 py-2">
              <span className="font-bold">AI Gate:</span>
              <span>AI Brand Guardian has rejected this brief. Address the issues and re-run the AI review to proceed.</span>
            </div>
          )}
        </div>
      )}

      {/* AI pre-submission gate banner (when AI hasn't run yet) */}
      {aiMode === 'pre-submission' && ai.isAvailable && ai.status === 'idle' && (
        <div className="border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">AI</span>
            <div>
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">AI Review Required</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This brief must pass AI Brand Guardian review before it can be exported.</p>
            </div>
            <button
              type="button"
              onClick={() => ai.run(data)}
              className="ml-auto px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
            >
              Run AI Review
            </button>
          </div>
        </div>
      )}

      {/* Section tabs */}
      {!(viewMode === 'ai' && (ai.status === 'running' || ai.status === 'error')) && (
        <>
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
                      ? viewMode === 'ai'
                        ? 'border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-400'
                        : 'border-brand-primary dark:border-brand-accent text-brand-primary dark:text-brand-accent'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {section.label}
                  {stats.errors > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold">
                      {stats.errors}
                    </span>
                  )}
                  {stats.errors === 0 && stats.warnings > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-bold">
                      {stats.warnings}
                    </span>
                  )}
                  {stats.errors === 0 && stats.warnings === 0 && stats.total > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 text-xs font-bold">
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
                      <FeedbackRow key={i} item={item} onGoToStep={onGoToStep} />
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </>
      )}

      {/* Accept / Decline */}
      <div className="flex gap-3">
        {isBlocked ? (
          <button
            type="button"
            disabled
            className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 px-4 rounded-md text-sm font-medium cursor-not-allowed"
          >
            {isAIRunning
              ? 'Waiting for AI review...'
              : isAIBlocked
                ? 'AI Review — Changes Required'
                : aiMode === 'pre-submission' && ai.status !== 'success'
                  ? 'AI Review Required to Proceed'
                  : `Score below ${MINIMUM_SCORE}% — Cannot Proceed`}
          </button>
        ) : review.status !== 'rejected' ? (
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 bg-brand-primary text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-brand-primary-hover transition-colors"
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
          className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Go Back &amp; Edit
        </button>
      </div>
    </div>
  )
}

function FeedbackRow({ item, onGoToStep }: { item: BrandFeedbackItem; onGoToStep: (step: number) => void }) {
  const icons = {
    pass: { symbol: '\u2713', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
    warning: { symbol: '!', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    error: { symbol: '\u2717', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  }
  const icon = icons[item.severity]
  const step = fieldToStep(item.field)
  const stepLabels = ['Campaign', 'Content', 'Review']

  return (
    <div className={`flex items-start gap-3 p-3 rounded-md ${icon.bg}`}>
      <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${icon.color} shrink-0 mt-0.5`}>
        {icon.symbol}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.field}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{item.message}</p>
      </div>
      {item.severity !== 'pass' && step !== null && (
        <button
          type="button"
          onClick={() => onGoToStep(step)}
          className="shrink-0 text-xs font-medium text-brand-primary dark:text-brand-accent hover:underline whitespace-nowrap"
          title={`Go to ${stepLabels[step]} step`}
        >
          Go to {stepLabels[step]}
        </button>
      )}
    </div>
  )
}
