import type { Match } from '../engine/types'

export type HighlightKind = Match['kind']
export interface Segment {
  text: string
  kinds: HighlightKind[]
}

const ORDER: HighlightKind[] = ['spam', 'caps', 'punctuation']

/** Splits text at every flag boundary; each segment lists the kinds of flag covering it. */
export function highlightSegments(text: string, matches: readonly Match[]): Segment[] {
  if (text === '') return []
  const valid = matches.filter((m) => m.start < m.end && m.start < text.length)
  const cuts = new Set<number>([0, text.length])
  for (const m of valid) {
    cuts.add(Math.max(0, m.start))
    cuts.add(Math.min(text.length, m.end))
  }
  const points = [...cuts].sort((a, b) => a - b)
  const segments: Segment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [from, to] = [points[i], points[i + 1]]
    const kinds = ORDER.filter((k) => valid.some((m) => m.kind === k && m.start <= from && m.end >= to))
    segments.push({ text: text.slice(from, to), kinds })
  }
  return segments
}
