import type { LexiconProvider } from '../LexiconProvider'
import type { SuggestionProvider } from '../SuggestionProvider'
import { DEFAULT_CONFIG } from '../../engine/config'
import { capsWordMatches, charCount, findTerms, truncateGraphemes } from '../../engine/text'

function removeRanges(text: string, ranges: { start: number; end: number }[]): string {
  return [...ranges].sort((a, b) => b.start - a.start).reduce((t, r) => t.slice(0, r.start) + t.slice(r.end), text)
}

function tidy(text: string): string {
  return text.replace(/\s{2,}/g, ' ').replace(/^[\s!?$.,:;|\-]+/, '').replace(/[\s,;:|\-]+$/, '').trim()
}

function softenPunctuation(text: string): string {
  let seenBang = false
  return text
    .replace(/[!?$]{2,}/g, (run) => run[0])
    .replace(/!/g, () => (seenBang ? '' : ((seenBang = true), '!')))
}

function shorten(text: string, max: number): string {
  if (charCount(text) <= max) return text
  const cut = truncateGraphemes(text, max)
  const lastSpace = cut.lastIndexOf(' ')
  return tidy(lastSpace > 0 ? cut.slice(0, lastSpace) : cut)
}

/** A deterministic stand-in for an AI provider: it cleans up the wording and shortens, keeping merge tags verbatim. */
export function createMockSuggestionProvider(lexicon: LexiconProvider): SuggestionProvider {
  return {
    async suggest(request) {
      if (request.failedChecks.length === 0) return []
      const terms = lexicon.getSpamTerms()
      const allow = lexicon.getAcronymAllowlist()
      const withoutSpam = removeRanges(request.subject, findTerms(request.subject, terms))
      const softened = softenPunctuation(withoutSpam)
      const capsFixed = capsWordMatches(softened, allow, DEFAULT_CONFIG.thresholds.capsMinLetters).reduceRight(
        (t, m) => t.slice(0, m.start) + m.text[0] + m.text.slice(1).toLowerCase() + t.slice(m.end),
        softened,
      )
      const clean = tidy(capsFixed)
      const candidates = [clean, shorten(clean, DEFAULT_CONFIG.thresholds.mobileMax), shorten(clean, DEFAULT_CONFIG.thresholds.desktopMax)]
      return [...new Set(candidates.filter((c) => c.trim() !== ''))].slice(0, request.max)
    },
  }
}
