import { useId, useState } from 'react'
import type { CategoryResult } from '../engine/types'

function tone(passed: number, total: number): { border: string; badge: string } {
  if (total > 0 && passed === total) return { border: 'border-emerald-300 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (passed >= total / 2) return { border: 'border-amber-300 dark:border-amber-800', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
  return { border: 'border-red-300 dark:border-red-800', badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' }
}

interface Props {
  category: CategoryResult
  /** The key metric line, e.g. "37 characters · 7 words" */
  metric: string
  defaultOpen?: boolean
}

export function CategoryCard({ category, metric, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const t = tone(category.passed, category.total)
  return (
    <section className={`rounded-lg border bg-white dark:bg-gray-900 ${t.border}`} aria-label={`${category.label}: ${category.passed} of ${category.total} checks passed`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{category.label}</span>
          <span className="mt-0.5 block min-h-[1.25rem] text-xs text-gray-500 dark:text-gray-400">{metric}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${t.badge}`}>{category.passed}/{category.total}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <ul id={panelId} hidden={!open} className="space-y-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        {category.checks.map((c) => (
          <li key={c.id} className="text-sm">
            <div className="flex items-start gap-2">
              {c.passed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              )}
              <div className="min-w-0">
                <p className="text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{c.label}</span>
                  <span className={`ml-2 text-xs font-semibold ${c.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {c.passed ? 'Passed' : c.critical ? 'Failed (critical)' : 'Needs fixing'}
                  </span>
                </p>
                {!c.passed && (
                  <>
                    <p className="mt-0.5 text-gray-600 dark:text-gray-300">{c.reason}</p>
                    <p className="mt-0.5 text-gray-600 dark:text-gray-300"><span className="font-medium">Fix:</span> {c.tip}</p>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
