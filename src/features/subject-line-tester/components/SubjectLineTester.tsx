import { useMemo, useState, type ReactNode } from 'react'
import { createMockDeps } from '../adapters/mock/createMockDeps'
import { renderMergeTags } from '../engine/mergeTags'
import { InboxPreview } from './InboxPreview/InboxPreview'
import type { PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import type { AnalysisInput, AnalysisResult } from '../engine/types'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSubjectLineAnalysis } from '../hooks/useSubjectLineAnalysis'
import { BAND_LABEL } from './bandStyles'
import { CategoryCard } from './CategoryCard'
import { HighlightedEcho } from './HighlightedEcho'
import { ScoreGauge } from './ScoreGauge'
import { SubjectInput, type SubjectFields } from './SubjectInput'

const DEFAULT_DEPS = createMockDeps()
const ANNOUNCE_DELAY_MS = 1000

function metricLine(result: AnalysisResult, category: 'length' | 'wording' | 'scannability'): string {
  const m = result.metrics
  if (result.empty) return 'No subject line yet'
  if (category === 'length') return `${m.chars} characters · ${m.words} ${m.words === 1 ? 'word' : 'words'}`
  if (category === 'wording') return `${m.flaggedTerms} flagged ${m.flaggedTerms === 1 ? 'term' : 'terms'}`
  return `${m.emojiCount} emoji`
}

interface Props {
  initial?: Partial<SubjectFields>
  deps?: AnalyzerDeps
  config?: PartialTesterConfig
  /** Show the "Test now" button (standalone page). */
  showTestNow?: boolean
  onChange?: (fields: SubjectFields) => void
  /** Hide the inbox preview (the compact variant in the builder shows it only on request). */
  showPreview?: boolean
  /** Replaces the default inbox preview. */
  renderPreview?: (input: AnalysisInput, result: AnalysisResult) => ReactNode
}

export function SubjectLineTester({ initial, deps = DEFAULT_DEPS, config, showTestNow = false, onChange, showPreview = true, renderPreview }: Props) {
  const [fields, setFields] = useState<SubjectFields>({
    subject: initial?.subject ?? '',
    senderName: initial?.senderName ?? '',
    preheader: initial?.preheader ?? '',
  })
  const input = useMemo<AnalysisInput>(() => ({ subject: fields.subject, senderName: fields.senderName, preheader: fields.preheader }), [fields])
  const { result, analyzeNow } = useSubjectLineAnalysis(input, deps, config)

  // Announce the score once the user pauses, not on every keystroke.
  const announcement = result.empty ? '' : `Score ${result.score} percent, ${BAND_LABEL[result.band]}.${result.cappedByCritical ? ' Capped by a critical issue.' : ''}`
  const announced = useDebouncedValue(announcement, ANNOUNCE_DELAY_MS)

  const update = (next: SubjectFields) => {
    setFields(next)
    onChange?.(next)
  }

  return (
    <div className="space-y-6">
      <SubjectInput value={fields} onChange={update} onTestNow={showTestNow ? analyzeNow : undefined} />
      <HighlightedEcho result={result} />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <ScoreGauge result={result} />
        <div className="flex-1 text-sm sm:min-h-[132px] text-gray-600 dark:text-gray-300">
          {result.empty ? (
            <p>Type a subject line to see how it scores for length, wording and scannability.</p>
          ) : (
            <p>
              {result.cappedByCritical
                ? 'A critical issue is holding the score down. Fix the flagged wording first.'
                : 'Open a category below to see what to improve.'}
            </p>
          )}
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">{announced}</p>

      <div className="grid gap-3 md:grid-cols-3">
        {result.categories.map((c) => (
          <CategoryCard key={c.id} category={c} metric={metricLine(result, c.id)} />
        ))}
      </div>

      {renderPreview ? (
        renderPreview(input, result)
      ) : (
        showPreview && (
          <InboxPreview
            subject={result.rendered}
            senderName={renderMergeTags(fields.senderName, deps.mergeTags, deps.sampleContact).rendered}
            preheader={renderMergeTags(fields.preheader, deps.mergeTags, deps.sampleContact).rendered}
          />
        )
      )}
    </div>
  )
}
