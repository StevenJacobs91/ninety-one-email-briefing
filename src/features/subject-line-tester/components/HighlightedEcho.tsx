import { useMemo } from 'react'
import type { AnalysisResult } from '../engine/types'
import { highlightSegments, type HighlightKind } from './highlightSegments'

// Colour is paired with a different underline style so the meaning never rests on colour alone.
const KIND_STYLE: Record<HighlightKind, string> = {
  spam: 'bg-red-200 text-red-950 underline decoration-wavy decoration-red-700 dark:bg-red-900/60 dark:text-red-50',
  caps: 'bg-amber-200 text-amber-950 underline decoration-dotted decoration-amber-800 dark:bg-amber-900/60 dark:text-amber-50',
  punctuation: 'bg-orange-200 text-orange-950 underline decoration-double decoration-orange-800 dark:bg-orange-900/60 dark:text-orange-50',
}
const KIND_LABEL: Record<HighlightKind, string> = { spam: 'Spam trigger', caps: 'ALL-CAPS', punctuation: 'Excess punctuation' }

export function HighlightedEcho({ result }: { result: AnalysisResult }) {
  const segments = useMemo(
    () => highlightSegments(result.rendered, result.categories.flatMap((c) => c.checks.flatMap((k) => k.matches ?? []))),
    [result],
  )
  const flagged = segments.filter((s) => s.kinds.length > 0).length
  return (
    <p
      className="min-h-[3rem] whitespace-pre-wrap break-words rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-200"
      aria-label={result.empty ? 'Subject line echo, empty' : `Subject line with ${flagged} flagged ${flagged === 1 ? 'part' : 'parts'}`}
    >
      {result.empty ? (
        <span className="text-gray-400">Flagged words will be highlighted here.</span>
      ) : (
        segments.map((s, i) =>
          s.kinds.length === 0 ? (
            <span key={i}>{s.text}</span>
          ) : (
            <mark key={i} className={`rounded-sm px-0.5 ${KIND_STYLE[s.kinds[0]]}`} title={s.kinds.map((k) => KIND_LABEL[k]).join(', ')}>
              {s.text}
            </mark>
          ),
        )
      )}
    </p>
  )
}
