import { useCallback, useEffect, useMemo, useState } from 'react'
import { analyzeSubjectLine } from '../engine/analyze'
import type { PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import type { AnalysisInput, AnalysisResult } from '../engine/types'

export const ANALYSIS_DEBOUNCE_MS = 250

const same = (a: AnalysisInput, b: AnalysisInput) =>
  a.subject === b.subject && a.senderName === b.senderName && a.preheader === b.preheader

/**
 * Runs the engine on the latest input after the user stops typing for `debounceMs`.
 * Keep `deps` and `config` referentially stable (module constants or useMemo) so the
 * analysis is only recomputed when the input changes.
 */
export function useSubjectLineAnalysis(
  input: AnalysisInput,
  deps: AnalyzerDeps,
  config?: PartialTesterConfig,
  debounceMs: number = ANALYSIS_DEBOUNCE_MS,
): { result: AnalysisResult; pending: boolean; analyzeNow: () => void } {
  const [settled, setSettled] = useState<AnalysisInput>(input)

  useEffect(() => {
    const timer = setTimeout(() => setSettled({ subject: input.subject, senderName: input.senderName, preheader: input.preheader }), debounceMs)
    return () => clearTimeout(timer)
  }, [input.subject, input.senderName, input.preheader, debounceMs])

  const result = useMemo(() => analyzeSubjectLine(settled, deps, config), [settled, deps, config])
  const analyzeNow = useCallback(() => setSettled({ subject: input.subject, senderName: input.senderName, preheader: input.preheader }), [input.subject, input.senderName, input.preheader])
  return { result, pending: !same(settled, input), analyzeNow }
}
