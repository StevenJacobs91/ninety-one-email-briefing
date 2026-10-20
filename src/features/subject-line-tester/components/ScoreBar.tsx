import { DEFAULT_CONFIG, type TesterConfig } from '../engine/config'
import type { AnalysisResult } from '../engine/types'
import { BAND_COLOUR, BAND_LABEL, BAND_STYLE } from './bandStyles'

interface Props {
  result: AnalysisResult
  bands?: TesterConfig['bands']
}

/** The score as a horizontal bar across the full width, filled in the colour of its band. */
export function ScoreBar({ result, bands = DEFAULT_CONFIG.bands }: Props) {
  const label = result.empty ? 'No score yet.' : `Score ${result.score} percent, ${BAND_LABEL[result.band]}.`
  const width = result.empty ? 0 : result.score

  return (
    <div className="w-full" role="img" aria-label={label}>
      <div className="mb-2 flex items-baseline justify-between gap-3" aria-hidden="true">
        {result.empty ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">Awaiting subject line</span>
        ) : (
          <>
            <span className={`font-ni-display text-2xl leading-none ${BAND_STYLE[result.band].text}`}>{result.score}%</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${BAND_STYLE[result.band].text}`}>{BAND_LABEL[result.band]}</span>
          </>
        )}
      </div>

      <div className="relative h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden="true">
        <div
          data-testid="score-bar-fill"
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${width}%`, backgroundColor: BAND_COLOUR[result.empty ? 'needs-work' : result.band] }}
        />
      </div>

      {/* where Good and Great begin */}
      <div className="relative mt-1 h-4 text-[10px] tabular-nums text-gray-400" aria-hidden="true">
        <span className="absolute left-0">0</span>
        {[bands.good, bands.great].map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${v}%` }}>{v}</span>
        ))}
        <span className="absolute right-0">100</span>
      </div>
    </div>
  )
}
