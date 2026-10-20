import { describe, expect, it } from 'vitest'
import { analyzeSubjectLine, bandFor } from '../engine/analyze'
import { AnalysisResultSchema } from '../engine/types'
import { deps } from './helpers'

const analyze = (subject: string, config = {}) => analyzeSubjectLine({ subject }, deps, config)
const failed = (r: ReturnType<typeof analyze>) => r.categories.flatMap((c) => c.checks).filter((c) => !c.passed).map((c) => c.id)

describe('AC-1 purity', () => {
  it('returns deep-equal results for identical input, deps and config', () => {
    const input = { subject: 'Hi {{Recipient.FirstName}}, your Q4 outlook is here' }
    expect(analyzeSubjectLine(input, deps)).toEqual(analyzeSubjectLine(input, deps))
  })
  it('leaves the adapter regexes untouched between calls', () => {
    const before = deps.mergeTags.pattern.lastIndex
    analyze('Hi {{Recipient.FirstName}} and {{Recipient.LastName}}')
    expect(deps.mergeTags.pattern.lastIndex).toBe(before)
  })
  it('does not mutate a frozen config or input', () => {
    const config = Object.freeze({ thresholds: Object.freeze({ mobileMax: 35 }) })
    const input = Object.freeze({ subject: 'Hello world today' })
    expect(() => analyzeSubjectLine(input, deps, config)).not.toThrow()
  })
})

describe('AC-2 grapheme counting', () => {
  it('"Sale 🇿🇦" is 6 characters', () => {
    expect(analyze('Sale 🇿🇦').metrics.chars).toBe(6)
  })
})

describe('AC-3 score', () => {
  it('is round(passed / total x 100): 12/12 = 100, 11/12 = 92, 10/12 = 83', () => {
    expect(analyze('Your 50% off gift is waiting').score).toBe(100)
    const one = analyze('Register to join | Navigating a rapidly changing market')
    expect(failed(one)).toEqual(['LEN-03'])
    expect(one.score).toBe(92)
    const two = analyze('Register to join | Navigating a rapidly changing market', { thresholds: { desktopMax: 50 } })
    expect(failed(two)).toEqual(['LEN-02', 'LEN-03'])
    expect(two.score).toBe(83)
  })
  it('honours per-check weights', () => {
    // LEN-03 weighs 3 of a total 14: (14 - 3) / 14 = 78.57 -> 79
    const r = analyze('Register to join | Navigating a rapidly changing market', { weights: { 'LEN-03': 3 } })
    expect(r.score).toBe(79)
  })
})

describe('AC-4 critical cap', () => {
  it('caps the score at criticalCap and flags it when a critical check fails', () => {
    const r = analyze('Claim your free gift today')
    expect(failed(r)).toEqual(['WRD-01'])
    expect(r.score).toBe(60)
    expect(r.cappedByCritical).toBe(true)
  })
  it('does not cap when nothing critical fails', () => {
    expect(analyze('Your 50% off gift is waiting').cappedByCritical).toBe(false)
  })
  it('follows configured critical checks and cap', () => {
    expect(analyze('Claim your free gift today', { criticalChecks: [] }).score).toBe(92)
    expect(analyze('Claim your free gift today', { criticalCap: 40 }).score).toBe(40)
  })
})

describe('AC-5 every failure explains itself', () => {
  it('has a reason and a tip on every failed check', () => {
    const r = analyze('FREE MONEY!!! Act now')
    for (const c of r.categories.flatMap((x) => x.checks)) {
      if (c.passed) continue
      expect(c.reason?.length, c.id).toBeGreaterThan(0)
      expect(c.tip?.length, c.id).toBeGreaterThan(0)
    }
  })
  it('returns correct ranges for WRD-01, WRD-02 and WRD-03', () => {
    const r = analyze('FREE MONEY!!! Act now')
    const check = (id: string) => r.categories.flatMap((c) => c.checks).find((c) => c.id === id)!
    for (const id of ['WRD-01', 'WRD-02', 'WRD-03']) {
      const matches = check(id).matches ?? []
      expect(matches.length, id).toBeGreaterThan(0)
      for (const m of matches) expect(r.rendered.slice(m.start, m.end), id).toBe(m.text)
    }
    expect(check('WRD-01').matches?.map((m) => m.text)).toEqual(['FREE MONEY'])
    expect(check('WRD-03').matches?.map((m) => m.text)).toEqual(['!!!'])
  })
})

describe('AC-6 merge tags', () => {
  it('substitutes sample values before the Length checks', () => {
    const r = analyze('Hi {{Recipient.FirstName}}, your Q4 outlook is here')
    expect(r.rendered).toBe('Hi Alexandra, your Q4 outlook is here')
    expect(r.metrics.chars).toBe(37)
    expect(failed(r)).toEqual([])
  })
  it('fails SCN-03 for an unknown field or an unresolved [Name]', () => {
    expect(failed(analyze('Hi {{Recipient.Nickname}}, your Q4 outlook is here'))).toContain('SCN-03')
    expect(failed(analyze('Hi [Name], your Q4 outlook is here'))).toContain('SCN-03')
  })
})

describe('AC-7 and AC-8 configuration', () => {
  it('changes the outcome from config alone: LEN-03 at 35', () => {
    const subject = 'Hi {{Recipient.FirstName}}, your Q4 outlook is here'
    expect(failed(analyze(subject))).not.toContain('LEN-03')
    expect(failed(analyze(subject, { thresholds: { mobileMax: 35 } }))).toContain('LEN-03')
  })
  it('adds or removes the financial-promotions terms from WRD-01', () => {
    const subject = 'Double your money in a year'
    expect(failed(analyze(subject))).toContain('WRD-01')
    expect(failed(analyze(subject, { lexiconPacks: ['general-spam'] }))).not.toContain('WRD-01')
  })
})

describe('result shape', () => {
  it('validates against the schema and has 3 categories of 4', () => {
    const r = analyze('Your 50% off gift is waiting')
    expect(() => AnalysisResultSchema.parse(r)).not.toThrow()
    expect(r.categories.map((c) => [c.id, c.total])).toEqual([['length', 4], ['wording', 4], ['scannability', 4]])
    expect(r.categories.every((c) => c.passed === 4)).toBe(true)
  })
  it('reports metrics', () => {
    const m = analyze('FREE MONEY!!! Act now 🎉').metrics
    expect(m).toMatchObject({ words: 4, emojiCount: 1, capsWords: 2, exclamations: 3, flaggedTerms: 1 })
  })
  it('bands: 90+ great, 70 to 89 good, below 70 needs work', () => {
    const bands = { great: 90, good: 70 }
    expect([100, 90, 89, 70, 69, 0].map((s) => bandFor(s, bands))).toEqual(['great', 'great', 'good', 'good', 'needs-work', 'needs-work'])
  })
})

describe('empty input', () => {
  it('returns the empty state: flagged empty, zero score, nothing to throw', () => {
    for (const s of ['', '   ']) {
      const r = analyze(s)
      expect(r.empty).toBe(true)
      expect(r.score).toBe(0)
      expect(r.metrics.chars).toBe(0)
      expect(() => AnalysisResultSchema.parse(r)).not.toThrow()
    }
  })
})
