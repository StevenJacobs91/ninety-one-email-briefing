import { analyzeSubjectLine } from './analyze'
import type { PartialTesterConfig } from './config'
import type { AnalyzerDeps } from './context'
import type { AnalysisResult } from './types'

/**
 * What is sent to a SuggestionProvider. By design it holds the subject with merge tags as
 * tags, and the id and fixed label of each failed check: never resolved contact values, the
 * sender, the preheader, or reasons built from the rendered text.
 */
export interface SuggestionRequest {
  subject: string
  failedChecks: { id: string; label: string }[]
  max: number
}

export interface ScoredSuggestion {
  subject: string
  result: AnalysisResult
}

export function buildSuggestionRequest(rawSubject: string, result: AnalysisResult, max = 3): SuggestionRequest {
  return {
    subject: rawSubject,
    failedChecks: result.categories.flatMap((c) => c.checks).filter((c) => !c.passed).map((c) => ({ id: c.id, label: c.label })),
    max,
  }
}

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Re-scores every candidate with the same engine, drops empties, duplicates, the original and
 * anything that does not improve the score, and returns the best first.
 */
export function rescoreSuggestions(
  original: string,
  candidates: readonly string[],
  deps: AnalyzerDeps,
  config?: PartialTesterConfig,
  limit = 3,
): ScoredSuggestion[] {
  const baseline = analyzeSubjectLine({ subject: original }, deps, config).score
  const seen = new Set<string>([key(original)])
  const scored: ScoredSuggestion[] = []
  for (const candidate of candidates) {
    const k = key(candidate)
    if (k === '' || seen.has(k)) continue
    seen.add(k)
    const result = analyzeSubjectLine({ subject: candidate.trim() }, deps, config)
    if (result.score > baseline) scored.push({ subject: candidate.trim(), result })
  }
  return scored
    .sort((a, b) => b.result.score - a.result.score || a.result.metrics.chars - b.result.metrics.chars)
    .slice(0, limit)
}
