import { describe, expect, it } from 'vitest'
import { runRule } from './helpers'
import { RULES } from '../engine/rules'

const x = (n: number) => 'x'.repeat(n)

describe('registry', () => {
  it('has the 12 checks, 4 per category, with unique ids', () => {
    expect(RULES).toHaveLength(12)
    expect(new Set(RULES.map((r) => r.id)).size).toBe(12)
    for (const c of ['length', 'wording', 'scannability']) expect(RULES.filter((r) => r.category === c)).toHaveLength(4)
  })
})

describe('Length', () => {
  it('LEN-01 needs at least 20 characters', () => {
    expect(runRule('LEN-01', x(19)).passed).toBe(false)
    expect(runRule('LEN-01', x(20)).passed).toBe(true)
  })
  it('LEN-02 allows at most 60 characters', () => {
    expect(runRule('LEN-02', x(60)).passed).toBe(true)
    expect(runRule('LEN-02', x(61)).passed).toBe(false)
  })
  it('LEN-03 allows at most 40 characters', () => {
    expect(runRule('LEN-03', x(40)).passed).toBe(true)
    expect(runRule('LEN-03', x(41)).passed).toBe(false)
  })
  it('LEN-03 measures the rendered text, not the raw tag', () => {
    expect(runRule('LEN-03', 'Hi {{Recipient.FirstName}}, your Q4 outlook is here').passed).toBe(true)
  })
  it('LEN-04 wants 3 to 9 words', () => {
    expect(runRule('LEN-04', 'Hello world').passed).toBe(false)
    expect(runRule('LEN-04', 'One two three').passed).toBe(true)
    expect(runRule('LEN-04', 'a b c d e f g h i').passed).toBe(true)
    expect(runRule('LEN-04', 'a b c d e f g h i j').passed).toBe(false)
  })
  it('LEN-04 does not count a lone separator as a word', () => {
    expect(runRule('LEN-04', 'one | two').passed).toBe(false)
  })
})

describe('Wording', () => {
  it('WRD-01 flags spam words and returns their ranges', () => {
    const r = runRule('WRD-01', 'Claim your free gift')
    expect(r.passed).toBe(false)
    expect(r.matches).toEqual([expect.objectContaining({ text: 'free', start: 11, end: 15, kind: 'spam' })])
    expect(r.reason).toMatch(/free/)
    expect(runRule('WRD-01', 'Your quarterly update').passed).toBe(true)
  })
  it('WRD-01 respects the enabled lexicon packs', () => {
    expect(runRule('WRD-01', 'Double your money in a year').passed).toBe(false)
    expect(runRule('WRD-01', 'Double your money in a year', { lexiconPacks: ['general-spam'] }).passed).toBe(true)
  })
  it('WRD-01 is critical by default', () => {
    expect(runRule('WRD-01', 'Claim your free gift').critical).toBe(true)
    expect(runRule('LEN-01', x(5)).critical).toBe(false)
  })
  it('WRD-02 allows one ALL-CAPS word, not two', () => {
    expect(runRule('WRD-02', 'Big NEWS today').passed).toBe(true)
    const r = runRule('WRD-02', 'FREE MONEY now')
    expect(r.passed).toBe(false)
    expect(r.matches?.map((m) => m.text)).toEqual(['FREE', 'MONEY'])
  })
  it('WRD-02 ignores allowlisted acronyms and short words', () => {
    expect(runRule('WRD-02', 'ESG USD CEO UK Q4 outlook').passed).toBe(true)
  })
  it('WRD-03 allows one exclamation mark and no runs', () => {
    expect(runRule('WRD-03', 'Great news!').passed).toBe(true)
    expect(runRule('WRD-03', 'Great! news!').passed).toBe(false)
    expect(runRule('WRD-03', 'What?!').passed).toBe(false)
    const r = runRule('WRD-03', 'Win $$$ today')
    expect(r.passed).toBe(false)
    expect(r.matches?.[0]).toMatchObject({ text: '$$$', kind: 'punctuation' })
  })
  it('WRD-04 needs a hook: digit, question mark, merge tag, you/your or a hook term', () => {
    expect(runRule('WRD-04', 'Quarterly market commentary').passed).toBe(false)
    for (const s of ['Q4 results', 'Ready for a change?', 'Hi {{Recipient.FirstName}} welcome', 'Thanks for your support', 'Register early', 'Last chance to book']) {
      expect(runRule('WRD-04', s).passed, s).toBe(true)
    }
  })
})

describe('Scannability', () => {
  it('SCN-01 allows two emoji, not adjacent', () => {
    expect(runRule('SCN-01', 'Great news 🎉').passed).toBe(true)
    expect(runRule('SCN-01', '🎉 news 🎊').passed).toBe(true)
    expect(runRule('SCN-01', '🎉🎊 news').passed).toBe(false)
    expect(runRule('SCN-01', '🎉 a 🎊 b 🚀').passed).toBe(false)
  })
  it('SCN-02 wants clean spacing and balanced brackets and quotes', () => {
    expect(runRule('SCN-02', ' leading space').passed).toBe(false)
    expect(runRule('SCN-02', 'trailing space ').passed).toBe(false)
    expect(runRule('SCN-02', 'double  space').passed).toBe(false)
    expect(runRule('SCN-02', 'unclosed (bracket').passed).toBe(false)
    expect(runRule('SCN-02', 'closed ) first (').passed).toBe(false)
    expect(runRule('SCN-02', 'open "quote').passed).toBe(false)
    expect(runRule('SCN-02', 'Fine (ok) [yes] "quote"').passed).toBe(true)
  })
  it('SCN-03 needs valid, known merge tags and no placeholders', () => {
    expect(runRule('SCN-03', 'Hi {{Recipient.FirstName}}').passed).toBe(true)
    expect(runRule('SCN-03', 'No tags at all').passed).toBe(true)
    expect(runRule('SCN-03', 'Hi {{Recipient.Nickname}}').passed).toBe(false)
    expect(runRule('SCN-03', 'Hi [Name]').passed).toBe(false)
    expect(runRule('SCN-03', 'Hi {{ }}').passed).toBe(false)
  })
  it('SCN-04 limits the longest word to 15 and the average to 7', () => {
    expect(runRule('SCN-04', 'Plain simple subject line').passed).toBe(true)
    expect(runRule('SCN-04', 'Internationalisation matters').passed).toBe(false)
    expect(runRule('SCN-04', 'Consolidation strategies determine outcomes').passed).toBe(false)
  })
})

describe('every failure explains itself', () => {
  it('gives a non-empty reason and tip', () => {
    const failing: [string, string][] = [
      ['LEN-01', x(5)], ['LEN-02', x(70)], ['LEN-03', x(50)], ['LEN-04', 'one two'],
      ['WRD-01', 'free money'], ['WRD-02', 'FREE MONEY now'], ['WRD-03', 'Wow!!'], ['WRD-04', 'Quarterly market commentary'],
      ['SCN-01', '🎉🎊'], ['SCN-02', 'a  b'], ['SCN-03', 'Hi [Name]'], ['SCN-04', 'Internationalisation matters'],
    ]
    for (const [id, subject] of failing) {
      const r = runRule(id, subject)
      expect(r.passed, id).toBe(false)
      expect(r.reason?.length, `${id} reason`).toBeGreaterThan(0)
      expect(r.tip?.length, `${id} tip`).toBeGreaterThan(0)
    }
  })
})

describe('unresolved tags are not judged as words', () => {
  it('SCN-04 ignores an unknown merge tag, so the mistake is reported once, by SCN-03', () => {
    expect(runRule('SCN-04', 'Hi {{Recipient.Nickname}}, Q4 news').passed).toBe(true)
    expect(runRule('SCN-03', 'Hi {{Recipient.Nickname}}, Q4 news').passed).toBe(false)
  })
})
