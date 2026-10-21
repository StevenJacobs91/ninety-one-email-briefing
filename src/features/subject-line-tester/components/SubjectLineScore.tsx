import { useMemo, useRef, useState } from 'react'
import { createMockDeps } from '../adapters/mock/createMockDeps'
import { resolveConfig, type PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import { useSubjectLineAnalysis } from '../hooks/useSubjectLineAnalysis'
import { BAND_COLOUR } from './bandStyles'
import { ScoreBar } from './ScoreBar'
import { SubjectLineTesterDialog } from './SubjectLineTesterDialog'

const DEFAULT_DEPS = createMockDeps()
const MAX_ISSUES_SHOWN = 3

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
 * The inline variant, shown in the Message Envelope section: the live score as a bar, the issues that matter
 * most with how to fix them, and the full tester (pre-filled) one click away. Advisory only: it never blocks sending.
 */
export function SubjectLineScore({ subject, senderName = '', preheader = '', deps = DEFAULT_DEPS, config, onApplySubject }: Props) {
  const input = useMemo(() => ({ subject, senderName, preheader }), [subject, senderName, preheader])
  const { result } = useSubjectLineAnalysis(input, deps, config)
  const bands = useMemo(() => resolveConfig(config).bands, [config])
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)

  // The critical issue first, since it is what holds the score down.
  const issues = result.categories.flatMap((c) => c.checks).filter((c) => !c.passed).sort((a, b) => Number(b.critical) - Number(a.critical))
  const shown = issues.slice(0, MAX_ISSUES_SHOWN)
  const rest = issues.length - shown.length

  return (
    <section
      aria-label="Subject line score"
      className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      style={result.empty ? undefined : { borderLeftColor: BAND_COLOUR[result.band], borderLeftWidth: 4 }}
    >
      <div className="space-y-3 p-4">
        <ScoreBar result={result} bands={bands} />

        {result.empty ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Type a subject line to see how it scores for length, wording and scannability.</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Every check passed.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.critical ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span>
                  {c.critical && <span className="mr-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-900/30 dark:text-red-300">Fix first</span>}
                  <span className="font-medium">{c.label}:</span> {c.reason}{' '}
                  <span className="text-gray-500 dark:text-gray-400">Fix: {c.tip}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {result.empty ? 'Advisory only' : issues.length === 0 ? 'No issues' : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`}
          {rest > 0 && <span> · <span>{rest} more in the full tester</span></span>}
        </p>
        <button
          ref={opener}
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-brand-primary/40 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-accent/40 dark:text-brand-accent"
        >
          See full tester
        </button>
      </div>

      {open && (
        <SubjectLineTesterDialog
          initial={{ subject, senderName, preheader }}
          deps={deps}
          config={config}
          onClose={() => setOpen(false)}
          onApplySubject={onApplySubject}
        />
      )}
    </section>
  )
}
