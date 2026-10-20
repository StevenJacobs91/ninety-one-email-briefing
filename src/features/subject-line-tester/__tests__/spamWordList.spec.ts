import { describe, expect, it } from 'vitest'
import { analyzeSubjectLine } from '../engine/analyze'
import { createMockDeps } from '../adapters/mock/createMockDeps'
import { createSettingsLexiconProvider } from '../adapters/settingsLexicon'
import { addSpamTerm, DEFAULT_SPAM_TERMS, removeSpamTerm, SPAM_PACKS, tidyTerm } from '../spamWordList'
import type { LexiconTerm } from '../engine/types'

const term = (t: string, pack = 'general-spam'): LexiconTerm => ({ term: t, severity: 'critical', pack })

describe('tidyTerm', () => {
  it('trims and collapses whitespace', () => {
    expect(tidyTerm('  free   money ')).toBe('free money')
  })
})

describe('addSpamTerm', () => {
  it('adds a tidied term to the chosen pack', () => {
    const r = addSpamTerm([], '  Act   Now ', 'general-spam')
    expect(r.error).toBeUndefined()
    expect(r.list).toEqual([term('Act Now')])
  })

  it('rejects an empty term', () => {
    expect(addSpamTerm([], '   ', 'general-spam')).toEqual({ list: [], error: 'Enter a word or phrase.' })
  })

  it('rejects a duplicate whatever its case, and says where it is', () => {
    const r = addSpamTerm([term('free money', 'financial-promotions')], 'FREE  Money', 'general-spam')
    expect(r.error).toMatch(/already in the list/)
    expect(r.list).toHaveLength(1)
  })

  it('rejects a very long phrase', () => {
    expect(addSpamTerm([], 'x'.repeat(61), 'general-spam').error).toMatch(/60 characters/)
  })

  it('rejects an unknown pack', () => {
    expect(addSpamTerm([], 'hello', 'nope').error).toMatch(/pack/i)
  })

  it('does not change the list it is given', () => {
    const original = Object.freeze([term('free')]) as LexiconTerm[]
    expect(() => addSpamTerm(original, 'cheap', 'general-spam')).not.toThrow()
    expect(original).toHaveLength(1)
  })
})

describe('removeSpamTerm', () => {
  it('removes exactly that term', () => {
    const list = [term('free'), term('cheap'), term('free', 'financial-promotions')]
    expect(removeSpamTerm(list, 'free', 'general-spam')).toEqual([term('cheap'), term('free', 'financial-promotions')])
  })

  it('leaves the list alone when the term is not there', () => {
    const list = [term('free')]
    expect(removeSpamTerm(list, 'nope', 'general-spam')).toEqual(list)
  })
})

describe('defaults', () => {
  it('ships a starting list in both packs', () => {
    expect(DEFAULT_SPAM_TERMS.length).toBeGreaterThan(20)
    expect(new Set(DEFAULT_SPAM_TERMS.map((t) => t.pack))).toEqual(new Set(SPAM_PACKS.map((p) => p.id)))
  })
})

describe('createSettingsLexiconProvider', () => {
  it('serves the given spam terms, with hooks and acronyms from the base lexicon', () => {
    const p = createSettingsLexiconProvider([term('quarterly')])
    expect(p.getSpamTerms()).toEqual([term('quarterly')])
    expect(p.getHookTerms().length).toBeGreaterThan(0)
    expect(p.getAcronymAllowlist()).toContain('ESG')
  })

  it('makes the analyser use the maintained list: a new word is flagged, a removed one is not', () => {
    const subject = 'Your quarterly update is ready'
    const base = createMockDeps()
    const flagged = analyzeSubjectLine({ subject }, { ...base, lexicon: createSettingsLexiconProvider([term('quarterly')]) })
    expect(flagged.categories.flatMap((c) => c.checks).find((c) => c.id === 'WRD-01')?.passed).toBe(false)

    const withoutFree = DEFAULT_SPAM_TERMS.filter((t) => t.term !== 'free')
    const gift = 'Claim your free gift today'
    const before = analyzeSubjectLine({ subject: gift }, { ...base, lexicon: createSettingsLexiconProvider(DEFAULT_SPAM_TERMS) })
    const after = analyzeSubjectLine({ subject: gift }, { ...base, lexicon: createSettingsLexiconProvider(withoutFree) })
    expect(before.score).toBe(60)
    expect(after.score).toBe(100)
  })
})
