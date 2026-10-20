import type { LexiconTerm } from '../engine/types'

export interface LexiconProvider {
  getSpamTerms(): readonly LexiconTerm[]
  getHookTerms(): readonly string[]
  getAcronymAllowlist(): readonly string[]
}
