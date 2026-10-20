import type { AnalysisResult } from '../engine/types'
import { BAND_LABEL, BAND_STYLE } from './bandStyles'

const RADIUS = 80
const ARC = Math.PI * RADIUS

// A fixed-size box, so the page never shifts as the score changes.
export function ScoreGauge({ result }: { result: AnalysisResult }) {
  const { empty, score, band } = result
  const style = BAND_STYLE[band]
  const filled = empty ? 0 : (ARC * score) / 100
  return (
    <div
      className="relative h-[132px] w-[200px] shrink-0"
      role="img"
      aria-label={empty ? 'No score yet' : `Score ${score} percent, ${BAND_LABEL[band]}`}
    >
      <svg viewBox="0 0 200 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-gray-200 dark:stroke-gray-700" />
        {!empty && (
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${ARC}`}
            className={`${style.stroke} transition-[stroke-dasharray] duration-300`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className={`font-ni-display text-4xl leading-none ${empty ? 'text-gray-400' : style.text}`}>{empty ? '–' : `${score}%`}</span>
        <span className={`mt-1 text-xs font-semibold uppercase tracking-wider ${empty ? 'text-gray-400' : style.text}`}>
          {empty ? 'Awaiting subject line' : BAND_LABEL[band]}
        </span>
      </div>
    </div>
  )
}
