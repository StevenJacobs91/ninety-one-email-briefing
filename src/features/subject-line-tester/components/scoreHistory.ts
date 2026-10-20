export interface ScorePoint {
  score: number
  subject: string
}

export const MAX_HISTORY = 20

/** Adds a point when the subject has changed; ignores empty text and repeats of the last subject. */
export function appendScore(history: readonly ScorePoint[], score: number, subject: string, max = MAX_HISTORY): ScorePoint[] {
  if (subject.trim() === '') return history as ScorePoint[]
  if (history.length > 0 && history[history.length - 1].subject === subject) return history as ScorePoint[]
  return [...history, { score, subject }].slice(-max)
}

/** Keeps the first and last dots inside the plot instead of half-clipped at its edges. */
const X_INSET = 4

/** Positions as percentages of the plot: x across the width, y down from the top (score 100 is y 0). */
export function chartPoints(history: readonly ScorePoint[]): { x: number; y: number; score: number }[] {
  const n = history.length
  return history.map((pt, i) => ({ x: n === 1 ? 50 : X_INSET + (i / (n - 1)) * (100 - 2 * X_INSET), y: 100 - pt.score, score: pt.score }))
}

export function describeHistory(history: readonly ScorePoint[]): string {
  if (history.length === 0) return 'No tests yet.'
  if (history.length === 1) return '1 test so far.'
  return `${history.length} tests, from ${history[0].score} to ${history[history.length - 1].score} percent.`
}
