import { useState } from 'react'
import type { SuggestionProvider } from '../adapters/SuggestionProvider'
import type { PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import { buildSuggestionRequest, rescoreSuggestions, type ScoredSuggestion } from '../engine/suggestions'
import type { AnalysisResult } from '../engine/types'
import { BAND_LABEL } from './bandStyles'

type State = { phase: 'idle' } | { phase: 'loading' } | { phase: 'done'; items: ScoredSuggestion[] } | { phase: 'error' }

interface Props {
  /** The subject as typed, merge tags unresolved: this is what a provider receives. */
  subject: string
  result: AnalysisResult
  provider: SuggestionProvider
  deps: AnalyzerDeps
  config?: PartialTesterConfig
  onUse: (subject: string) => void
}

export function SuggestionsPanel({ subject, result, provider, deps, config, onUse }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' })

  const run = async () => {
    setState({ phase: 'loading' })
    try {
      const candidates = await provider.suggest(buildSuggestionRequest(subject, result))
      // Every suggestion is re-scored by the same engine before it is shown.
      setState({ phase: 'done', items: rescoreSuggestions(subject, candidates, deps, config) })
    } catch {
      setState({ phase: 'error' })
    }
  }

  return (
    <section aria-label="Suggested rewrites" className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Suggested rewrites</h3>
        <button
          type="button"
          onClick={run}
          disabled={result.empty || state.phase === 'loading'}
          className="rounded-md border border-brand-primary/40 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/5 disabled:opacity-40 dark:text-brand-accent"
        >
          Suggest rewrites
        </button>
      </div>
      <div aria-live="polite" className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {state.phase === 'loading' && <p>Finding rewrites…</p>}
        {state.phase === 'error' && <p role="alert">Could not get suggestions. Try again.</p>}
        {state.phase === 'done' && state.items.length === 0 && <p>No better rewrite found.</p>}
        {state.phase === 'done' && state.items.length > 0 && (
          <ul className="space-y-2">
            {state.items.map((s) => (
              <li key={s.subject} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
                <span className="min-w-0 break-words text-gray-900 dark:text-gray-100">{s.subject}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums">{s.result.score}% · {BAND_LABEL[s.result.band]}</span>
                  <button type="button" onClick={() => onUse(s.subject)} className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-primary-hover">
                    Use this
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
