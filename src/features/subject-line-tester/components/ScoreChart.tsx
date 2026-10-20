import { DEFAULT_CONFIG, type TesterConfig } from '../engine/config'
import type { AnalysisResult } from '../engine/types'
import { BAND_LABEL, BAND_STYLE } from './bandStyles'
import { chartPoints, describeHistory, type ScorePoint } from './scoreHistory'

interface Props {
  result: AnalysisResult
  history: readonly ScorePoint[]
  bands?: TesterConfig['bands']
}

const LEFT = 'left-9'

/** The score over this session's edits, across the full width, with the three bands as zones behind it. */
export function ScoreChart({ result, history, bands = DEFAULT_CONFIG.bands }: Props) {
  const points = chartPoints(history)
  const last = points[points.length - 1]
  const style = BAND_STYLE[result.band]
  const label = result.empty ? 'No score yet.' : `Score ${result.score} percent, ${BAND_LABEL[result.band]}.`
  const yOf = (score: number) => 100 - score

  return (
    <div className="relative h-[168px] w-full" role="img" aria-label={`${label} ${describeHistory(history)}`}>
      {/* y axis */}
      {[100, bands.great, bands.good, 0].map((v) => (
        <span key={v} className="absolute left-0 w-7 -translate-y-1/2 text-right text-[10px] tabular-nums text-gray-400" style={{ top: `${yOf(v)}%` }}>
          {v}
        </span>
      ))}

      <div className={`absolute inset-y-0 right-[4.75rem] ${LEFT}`}>
        {/* zones and line */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-hidden rounded-md" aria-hidden="true">
          <rect x="0" y="0" width="100" height={yOf(bands.great)} className="fill-emerald-100 dark:fill-emerald-900/30" />
          <rect x="0" y={yOf(bands.great)} width="100" height={bands.great - bands.good} className="fill-amber-100 dark:fill-amber-900/30" />
          <rect x="0" y={yOf(bands.good)} width="100" height={bands.good} className="fill-red-100 dark:fill-red-900/30" />
          {points.length > 1 && (
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={`${style.stroke} transition-all duration-300`}
            />
          )}
        </svg>

        {result.empty && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">Awaiting subject line</span>
        )}

        {/* points */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1
          return (
            <span
              key={i}
              data-testid="chart-point"
              aria-hidden="true"
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white dark:bg-gray-900 ${isLast ? `h-3.5 w-3.5 ${style.stroke.replace('stroke-', 'border-')}` : 'h-2 w-2 border-gray-400'}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          )
        })}

        {/* the latest score, beside its point */}
        {last && !result.empty && (
          <span
            className={`absolute whitespace-nowrap font-ni-display text-lg leading-none ${style.text}`}
            style={{
              left: `${last.x}%`,
              top: `${last.y}%`,
              transform: `translate(${last.x > 85 ? '-130%' : last.x < 15 ? '30%' : '-50%'}, ${last.y < 25 ? '60%' : '-170%'})`,
            }}
          >
            {result.score}%
          </span>
        )}
      </div>
      {/* zone names in their own gutter, so they never sit under the line: text as well as colour */}
      {(
        [
          ['great', yOf(bands.great) / 2],
          ['good', yOf(bands.great) + (bands.great - bands.good) / 2],
          ['needs-work', yOf(bands.good) + bands.good / 2],
        ] as const
      ).map(([band, y]) => (
        <span key={band} className={`pointer-events-none absolute right-0 w-[4.25rem] -translate-y-1/2 text-[10px] font-semibold uppercase leading-tight tracking-wider ${BAND_STYLE[band].text}`} style={{ top: `${y}%` }}>
          {BAND_LABEL[band]}
        </span>
      ))}
    </div>
  )
}
