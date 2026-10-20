import { useId, useMemo, useState } from 'react'
import { createMockDeps } from '../adapters/mock/createMockDeps'
import type { PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import { useSubjectLineAnalysis } from '../hooks/useSubjectLineAnalysis'
import { BAND_LABEL } from './bandStyles'
import { SubjectLineTesterDialog } from './SubjectLineTesterDialog'

const DEFAULT_DEPS = createMockDeps()

const PILL: Record<'great' | 'good' | 'needs-work', string> = {
  great: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  good: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'needs-work': 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300',
}

interface Props {
  subject: string
  senderName?: string
  preheader?: string
  deps?: AnalyzerDeps
  config?: PartialTesterConfig
  /** Lets the full tester write an edited subject line back to the brief. */
  onApplySubject?: (subject: string) => void
}

/**
 * The compact variant: a live score pill beside the subject line field, an expandable
 * list of the top issues, and the full tester (pre-filled) one click away. Advisory only.
 */
export function SubjectLineScore({ subject, senderName = '', preheader = '', deps = DEFAULT_DEPS, config, onApplySubject }: Props) {
  const input = useMemo(() => ({ subject, senderName, preheader }), [subject, senderName, preheader])
  const { result } = useSubjectLineAnalysis(input, deps, config)
  const [open, setOpen] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const panelId = useId()
  const issues = result.categories.flatMap((c) => c.checks).filter((c) => !c.passed)

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={result.empty ? 'Open the subject line tester' : `Subject line score ${result.score} percent, ${BAND_LABEL[result.band]}. Open the subject line tester`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
            result.empty ? 'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300' : PILL[result.band]
          }`}
        >
          {result.empty ? 'Test subject line' : `${result.score}% · ${BAND_LABEL[result.band]}`}
        </button>
        {!result.empty && (
          <button
            type="button"
            onClick={() => setShowIssues((s) => !s)}
            aria-expanded={showIssues}
            aria-controls={panelId}
            className="text-xs text-gray-500 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:text-gray-400"
          >
            {issues.length === 0 ? 'No issues' : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`}
          </button>
        )}
      </div>

      <ul id={panelId} hidden={!showIssues || result.empty} className="mt-2 space-y-1.5 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800/50">
        {issues.length === 0 ? (
          <li className="text-gray-600 dark:text-gray-300">Every check passed.</li>
        ) : (
          issues.slice(0, 4).map((c) => (
            <li key={c.id} className="text-gray-700 dark:text-gray-200">
              <span className="font-medium">{c.label}:</span> {c.reason} <span className="text-gray-500 dark:text-gray-400">Fix: {c.tip}</span>
            </li>
          ))
        )}
        {issues.length > 4 && <li className="text-gray-500 dark:text-gray-400">And {issues.length - 4} more in the full tester.</li>}
      </ul>

      {open && (
        <SubjectLineTesterDialog
          initial={{ subject, senderName, preheader }}
          deps={deps}
          config={config}
          onClose={() => setOpen(false)}
          onApplySubject={onApplySubject}
        />
      )}
    </div>
  )
}
