import { useMemo, useState } from 'react'
import type { BrandFeedbackItem } from '../../lib/brandGuardian'
import { fieldToTab } from '../../lib/brandReviewGate'
import { BRIEF_TABS, type BriefTabId } from '../../lib/briefTabs'
import type { BrandReviewState } from '../../hooks/useBrandReviewGate'

const STATUS_LABEL = { approved: 'Approved', 'needs-review': 'Needs review', rejected: 'Changes required' } as const
const STATUS_DOT = { approved: 'bg-green-500', 'needs-review': 'bg-amber-500', rejected: 'bg-red-500' } as const
const TAB_LABEL = Object.fromEntries(BRIEF_TABS.map((t) => [t.id, t.label])) as Record<BriefTabId, string>
const SEVERITY_ORDER = { error: 0, warning: 1, pass: 2 } as const

interface Props {
  state: BrandReviewState
  onGoToTab: (tab: BriefTabId) => void
}

export function BrandReviewPanel({ state, onGoToTab }: Props) {
  const { review, ai, aiMode, data, blocked, reason } = state
  const [showPasses, setShowPasses] = useState(false)
  const [viewAI, setViewAI] = useState(false)
  const active = viewAI && ai.review ? ai.review : review

  const items = useMemo(
    () => [...active.items].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [active.items],
  )
  const issues = items.filter((i) => i.severity !== 'pass')
  const passes = items.filter((i) => i.severity === 'pass')

  return (
    <div className="bg-brand-bg-panel dark:bg-brand-bg-panel-dark border border-brand-border-warm dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
        <p className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">Brand Review</p>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={`w-3 h-3 rounded-full ${STATUS_DOT[active.status]}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-primary dark:text-gray-200">{STATUS_LABEL[active.status]}</p>
          <p className="text-xs text-brand-text-muted dark:text-gray-400 leading-snug">{active.summary}</p>
        </div>
        <span className="ml-auto text-2xl font-bold text-brand-primary dark:text-gray-200">{active.score}%</span>
      </div>

      {blocked && reason && (
        <p role="alert" className="mb-3 text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-2">
          <span className="font-bold">Blocked: </span>{reason}
        </p>
      )}

      {ai.isAvailable && (
        <div className="flex items-center gap-2 mb-4 text-xs">
          <button type="button" onClick={() => setViewAI(false)}
            className={`px-2.5 py-1 border ${!viewAI ? 'bg-brand-primary text-white border-brand-primary' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            Rules
          </button>
          <button type="button"
            onClick={() => { setViewAI(true); if (ai.status === 'idle') ai.run(data) }}
            className={`px-2.5 py-1 border ${viewAI ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
            AI review
          </button>
          {ai.status === 'running' && <span className="text-gray-400">Analysing…</span>}
          {aiMode === 'pre-submission' && ai.status === 'error' && (
            <button type="button" onClick={() => ai.run(data)} className="underline text-red-700 dark:text-red-400">Retry</button>
          )}
        </div>
      )}

      {issues.length === 0 ? (
        <p className="text-sm text-brand-text-body dark:text-gray-300">No issues found.</p>
      ) : (
        <ul className="space-y-2">
          {issues.map((item, i) => <FeedbackRow key={i} item={item} onGoToTab={onGoToTab} />)}
        </ul>
      )}

      {passes.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowPasses((v) => !v)}
            className="text-xs text-brand-primary dark:text-brand-accent hover:underline">
            {showPasses ? 'Hide' : 'Show'} {passes.length} passed checks
          </button>
          {showPasses && (
            <ul className="mt-2 space-y-1.5">
              {passes.map((item, i) => <FeedbackRow key={i} item={item} onGoToTab={onGoToTab} />)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function FeedbackRow({ item, onGoToTab }: { item: BrandFeedbackItem; onGoToTab: (tab: BriefTabId) => void }) {
  const tab = fieldToTab(item.field)
  const tone = item.severity === 'error' ? 'text-red-600' : item.severity === 'warning' ? 'text-amber-600' : 'text-green-600'
  const symbol = item.severity === 'error' ? '✗' : item.severity === 'warning' ? '!' : '✓'
  return (
    <li className="flex items-start gap-2 text-xs">
      <span className={`font-bold w-3 shrink-0 ${tone}`} aria-hidden="true">{symbol}</span>
      <span className="min-w-0 flex-1 text-brand-text-body dark:text-gray-300 leading-snug">{item.message}</span>
      {item.severity !== 'pass' && tab && (
        <button type="button" onClick={() => onGoToTab(tab)}
          className="shrink-0 text-brand-primary dark:text-brand-accent hover:underline whitespace-nowrap">
          {TAB_LABEL[tab]}
        </button>
      )}
    </li>
  )
}
