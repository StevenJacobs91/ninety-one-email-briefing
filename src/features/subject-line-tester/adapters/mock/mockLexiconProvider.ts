import type { LexiconProvider } from '../LexiconProvider'
import { LexiconTermSchema } from '../../engine/types'
import data from '../../data/mock-lexicon.json'
import { z } from 'zod'

const LexiconDataSchema = z.object({
  terms: z.array(LexiconTermSchema),
  hooks: z.array(z.string()),
  acronyms: z.array(z.string()),
})

export function createMockLexiconProvider(source: unknown = data): LexiconProvider {
  const lexicon = LexiconDataSchema.parse(source)
  return {
    getSpamTerms: () => lexicon.terms,
    getHookTerms: () => lexicon.hooks,
    getAcronymAllowlist: () => lexicon.acronyms,
  }
}
