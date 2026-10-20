import { describe, expect, it } from 'vitest'
import { analyzeSubjectLine } from '../engine/analyze'
import { buildSuggestionRequest, rescoreSuggestions } from '../engine/suggestions'
import { createMockSuggestionProvider } from '../adapters/mock/mockSuggestionProvider'
import { createMockLexiconProvider } from '../adapters/mock'
import { deps } from './helpers'

const analyze = (subject: string) => analyzeSubjectLine({ subject }, deps)

describe('buildSuggestionRequest (privacy)', () => {
  it('sends the subject with merge tags as tags, never as sample values', () => {
    const raw = 'FREE gift for {{Recipient.FirstName}} at {{Recipient.Company}}!!!'
    const req = buildSuggestionRequest(raw, analyze(raw))
    expect(req.subject).toBe(raw)
    const sent = JSON.stringify(req)
    expect(sent).toContain('{{Recipient.FirstName}}')
    expect(sent).not.toContain('Alexandra')
    expect(sent).not.toContain('Acme Capital')
  })

  it('sends only the ids and fixed labels of failed checks, not reasons derived from rendered text', () => {
    const raw = 'Hi {{Recipient.FirstName}}'
    const req = buildSuggestionRequest(raw, analyze(raw))
    expect(req.failedChecks.length).toBeGreaterThan(0)
    for (const c of req.failedChecks) expect(Object.keys(c).sort()).toEqual(['id', 'label'])
    expect(JSON.stringify(req)).not.toContain('Alexandra')
  })

  it('never includes the sender name, preheader or contact data', () => {
    const req = buildSuggestionRequest('Claim your free gift', analyze('Claim your free gift'))
    expect(Object.keys(req).sort()).toEqual(['failedChecks', 'max', 'subject'])
  })
})

describe('rescoreSuggestions', () => {
  const original = 'FREE MONEY!!! Act now'

  it('re-scores every candidate with the same engine and sorts best first', () => {
    const out = rescoreSuggestions(original, ['Act now to claim your gift', 'Your 50% off gift is waiting'], deps)
    expect(out.map((s) => s.result.score)).toEqual([...out.map((s) => s.result.score)].sort((a, b) => b - a))
    for (const s of out) expect(s.result).toEqual(analyze(s.subject))
  })

  it('drops empties, duplicates, the original, and anything that does not improve the score', () => {
    const out = rescoreSuggestions(
      original,
      ['', '   ', original, 'FREE MONEY!!! Act now', 'Your 50% off gift is waiting', 'your 50% off gift is waiting', 'FREE MONEY!!! Act now!!!'],
      deps,
    )
    expect(out.map((s) => s.subject)).toEqual(['Your 50% off gift is waiting'])
  })

  it('limits how many are returned', () => {
    const many = ['Your 50% off gift is waiting', 'Hi {{Recipient.FirstName}}, your Q4 outlook is here', 'Plan your Q4 review!', 'Is your portfolio ready for Q4?']
    expect(rescoreSuggestions(original, many, deps, undefined, 2)).toHaveLength(2)
  })

  it('keeps merge tags in the suggestion as tags, scored on their sample values', () => {
    const out = rescoreSuggestions(original, ['Hi {{Recipient.FirstName}}, your Q4 outlook is here'], deps)
    expect(out[0].subject).toContain('{{Recipient.FirstName}}')
    expect(out[0].result.rendered).toContain('Alexandra')
    expect(out[0].result.score).toBe(100)
  })

  it('returns nothing when the original is already top scoring', () => {
    expect(rescoreSuggestions('Your 50% off gift is waiting', ['Plan your Q4 review!'], deps)).toEqual([])
  })
})

describe('mock suggestion provider', () => {
  const provider = createMockSuggestionProvider(createMockLexiconProvider())
  const req = (subject: string) => buildSuggestionRequest(subject, analyze(subject))

  it('removes spam terms, softens caps and punctuation, and keeps merge tags verbatim', async () => {
    const out = await provider.suggest(req('FREE MONEY!!! Act now for {{Recipient.FirstName}}'))
    expect(out.length).toBeGreaterThan(0)
    for (const s of out) {
      expect(s).toContain('{{Recipient.FirstName}}')
      expect(s).not.toMatch(/FREE MONEY/)
      expect(s).not.toMatch(/!!/)
    }
  })

  it('shortens a long subject at a word boundary', async () => {
    const long = 'Navigating a rapidly changing world: Q4 market outlook and what it means for your portfolio'
    const out = await provider.suggest(req(long))
    expect(out.some((s) => s.length <= 40 && long.startsWith(s.replace(/[:,;\s]+$/, '')))).toBe(true)
  })

  it('returns unique, non-empty candidates and respects the limit', async () => {
    const out = await provider.suggest({ ...req('FREE MONEY!!! Act now'), max: 2 })
    expect(new Set(out).size).toBe(out.length)
    expect(out.every((s) => s.trim() !== '')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(2)
  })

  it('has nothing to offer when nothing failed', async () => {
    expect(await provider.suggest(req('Your 50% off gift is waiting'))).toEqual([])
  })
})
