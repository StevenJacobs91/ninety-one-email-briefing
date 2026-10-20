import type { LexiconTerm, Match } from './types'

// Measurement rules from the spec §3.2. All helpers are pure; regexes are built per call
// so no state (lastIndex) leaks between analyses.

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️|\p{Regional_Indicator}|⃣/u

export interface Token {
  text: string
  start: number
  end: number
}

/** Characters as the reader sees them: an emoji, flag or accented letter is 1, not 2 to 8 code units. */
export function charCount(text: string): number {
  let n = 0
  for (const _ of segmenter.segment(text)) n++ // eslint-disable-line @typescript-eslint/no-unused-vars
  return n
}

export function tokenize(text: string): Token[] {
  return [...text.matchAll(/\S+/gu)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
}

/** Whitespace-separated tokens that contain at least one letter or digit. */
export function words(text: string): Token[] {
  return tokenize(text).filter((t) => LETTER_OR_DIGIT.test(t.text))
}

/** The word without leading/trailing punctuation, and where it starts inside the token. */
export function wordCore(token: string): { core: string; offset: number } {
  const m = token.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u)
  return { core: m?.[2] ?? token, offset: m?.[1].length ?? 0 }
}

export function emojiClusters(text: string): Token[] {
  const out: Token[] = []
  for (const { segment, index } of segmenter.segment(text)) {
    if (EMOJI.test(segment)) out.push({ text: segment, start: index, end: index + segment.length })
  }
  return out
}

export function capsWordMatches(text: string, allowlist: readonly string[], minLetters: number): Match[] {
  const allowed = new Set(allowlist.map((a) => a.toLowerCase()))
  const out: Match[] = []
  for (const token of words(text)) {
    const { core, offset } = wordCore(token.text)
    const letters = [...core].filter((c) => /\p{L}/u.test(c)).length
    const isUpper = core === core.toUpperCase() && core !== core.toLowerCase()
    if (letters >= minLetters && isUpper && !allowed.has(core.toLowerCase())) {
      const start = token.start + offset
      out.push({ start, end: start + core.length, kind: 'caps', text: core })
    }
  }
  return out
}

/** Runs of 2+ of ! ? $, plus every ! when there are more than `exclamationsMax` of them. */
export function punctuationMatches(text: string, exclamationsMax = 1): { matches: Match[]; exclamations: number } {
  const exclamations = (text.match(/!/g) ?? []).length
  const matches: Match[] = [...text.matchAll(/[!?$]{2,}/g)].map((m) => ({
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
    kind: 'punctuation' as const,
    text: m[0],
  }))
  if (exclamations > exclamationsMax) {
    for (const m of text.matchAll(/!/g)) {
      const start = m.index ?? 0
      if (!matches.some((r) => start >= r.start && start < r.end)) {
        matches.push({ start, end: start + 1, kind: 'punctuation', text: '!' })
      }
    }
  }
  return { matches: matches.sort((a, b) => a.start - b.start), exclamations }
}

// Same length as the input, so offsets stay valid.
function normalizeForMatch(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function phraseRegExp(term: string): RegExp {
  const body = normalizeForMatch(term).trim().split(/\s+/).map(escapeRegExp).join('\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu')
}

/** Whole-word or whole-phrase, case-insensitive matches. When matches overlap the longest wins. */
export function findTerms(text: string, terms: readonly LexiconTerm[]): Match[] {
  const haystack = normalizeForMatch(text)
  const candidates: Match[] = []
  for (const t of terms) {
    for (const m of haystack.matchAll(phraseRegExp(t.term))) {
      const start = m.index ?? 0
      candidates.push({ start, end: start + m[0].length, kind: 'spam', text: text.slice(start, start + m[0].length), severity: t.severity })
    }
  }
  const byLength = [...candidates].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || (a.severity === 'critical' ? -1 : 1) || a.start - b.start,
  )
  const chosen: Match[] = []
  for (const c of byLength) {
    if (!chosen.some((k) => c.start < k.end && c.end > k.start)) chosen.push(c)
  }
  return chosen.sort((a, b) => a.start - b.start)
}

/** The first `max` characters, never splitting an emoji, flag or accented letter. */
export function truncateGraphemes(text: string, max: number): string {
  let out = ''
  let n = 0
  for (const { segment } of segmenter.segment(text)) {
    if (n >= max) break
    out += segment
    n++
  }
  return out
}
