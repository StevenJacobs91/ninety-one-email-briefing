import { z } from 'zod'
import lexicon from './data/mock-lexicon.json'
import { LexiconTermSchema, type LexiconTerm } from './engine/types'

/** The packs a term belongs to; they group the list. Which packs are checked is set in the tester's config. */
export const SPAM_PACKS = [
  { id: 'general-spam', label: 'General spam' },
  { id: 'financial-promotions', label: 'Financial promotions' },
] as const

export const MAX_TERM_LENGTH = 60

/** The starting list, used until someone maintains their own in Settings. */
export const DEFAULT_SPAM_TERMS: readonly LexiconTerm[] = z.array(LexiconTermSchema).parse(lexicon.terms)

export function tidyTerm(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

const key = (t: string) => tidyTerm(t).toLowerCase()

export function addSpamTerm(list: readonly LexiconTerm[], text: string, pack: string): { list: LexiconTerm[]; error?: string } {
  const unchanged = [...list]
  const term = tidyTerm(text)
  if (term === '') return { list: unchanged, error: 'Enter a word or phrase.' }
  if (term.length > MAX_TERM_LENGTH) return { list: unchanged, error: `Keep it to ${MAX_TERM_LENGTH} characters or fewer.` }
  if (!SPAM_PACKS.some((p) => p.id === pack)) return { list: unchanged, error: 'Choose a pack for this term.' }
  const existing = list.find((t) => key(t.term) === key(term))
  if (existing) {
    const where = SPAM_PACKS.find((p) => p.id === existing.pack)?.label ?? existing.pack
    return { list: unchanged, error: `"${existing.term}" is already in the list (${where}).` }
  }
  return { list: [...list, { term, severity: 'critical', pack }] }
}

export function removeSpamTerm(list: readonly LexiconTerm[], term: string, pack: string): LexiconTerm[] {
  return list.filter((t) => !(t.term === term && t.pack === pack))
}
