import type { LexiconTerm } from '../engine/types'
import type { LexiconProvider } from './LexiconProvider'
import { createMockLexiconProvider } from './mock'

/**
 * A lexicon whose spam terms come from the list maintained in Settings. The hook words and the
 * acronym allowlist still come from `base` (the mock data until those get their own source).
 */
export function createSettingsLexiconProvider(terms: readonly LexiconTerm[], base: LexiconProvider = createMockLexiconProvider()): LexiconProvider {
  return {
    getSpamTerms: () => terms,
    getHookTerms: () => base.getHookTerms(),
    getAcronymAllowlist: () => base.getAcronymAllowlist(),
  }
}
