import { describe, expect, it } from 'vitest'
import {
  charCount, emojiClusters, tokenize, words, wordCore, capsWordMatches, punctuationMatches, findTerms,
} from '../engine/text'

describe('charCount (grapheme clusters)', () => {
  it('counts a flag as one character: "Sale 🇿🇦" is 6', () => {
    expect(charCount('Sale 🇿🇦')).toBe(6)
  })
  it('counts emoji with modifiers and joiners as one', () => {
    expect(charCount('👍🏽')).toBe(1)
    expect(charCount('👩‍💻')).toBe(1)
  })
  it('counts plain text and non-Latin text by character', () => {
    expect(charCount('Hello')).toBe(5)
    expect(charCount('こんにちは')).toBe(5)
    expect(charCount('')).toBe(0)
  })
})

describe('words', () => {
  it('ignores tokens with no letter or digit, like a lone | or -', () => {
    expect(words('Register to join | Navigating').map((w) => w.text)).toEqual(['Register', 'to', 'join', 'Navigating'])
    expect(words('a - b').map((w) => w.text)).toEqual(['a', 'b'])
  })
  it('keeps digits as words and records offsets', () => {
    const w = words('Q4 results')
    expect(w.map((x) => x.text)).toEqual(['Q4', 'results'])
    expect(w[1]).toMatchObject({ start: 3, end: 10 })
  })
  it('tokenize keeps every whitespace-separated token', () => {
    expect(tokenize('a | b')).toHaveLength(3)
  })
  it('wordCore strips surrounding punctuation and reports the offset', () => {
    expect(wordCore('"world:"')).toEqual({ core: 'world', offset: 1 })
    expect(wordCore('50%')).toEqual({ core: '50', offset: 0 })
  })
})

describe('emojiClusters', () => {
  it('finds emoji, flags, keycaps and ZWJ sequences, with offsets', () => {
    expect(emojiClusters('Hi 🎉 ok')).toEqual([{ text: '🎉', start: 3, end: 5 }])
    expect(emojiClusters('Go 🇿🇦')).toHaveLength(1)
    expect(emojiClusters('1️⃣ first')).toHaveLength(1)
    expect(emojiClusters('👩‍💻 dev')).toHaveLength(1)
  })
  it('does not treat digits, symbols or text as emoji', () => {
    expect(emojiClusters('Q4 50% © ok')).toHaveLength(0)
  })
})

describe('capsWordMatches', () => {
  const allow = ['ESG', 'USD', 'CEO']
  it('flags fully-uppercase words of 3+ letters with ranges', () => {
    const m = capsWordMatches('FREE MONEY now', allow, 3)
    expect(m.map((x) => x.text)).toEqual(['FREE', 'MONEY'])
    expect(m[0]).toMatchObject({ start: 0, end: 4, kind: 'caps' })
  })
  it('ignores short words, acronyms on the allowlist (any case), mixed case and digits', () => {
    expect(capsWordMatches('Q4 UK ESG esg USD CEO Hello 2024', allow, 3)).toEqual([])
  })
  it('counts the letters only, so "A1B" and "50%" are not caps words', () => {
    expect(capsWordMatches('A1B 50%', allow, 3)).toEqual([])
  })
})

describe('punctuationMatches', () => {
  it('flags runs of 2+ of ! ? $', () => {
    const { matches, exclamations } = punctuationMatches('FREE!!! Win $$$ now?!')
    expect(exclamations).toBe(4)
    expect(matches.map((m) => m.text)).toEqual(['!!!', '$$$', '?!'])
  })
  it('flags every ! when there is more than one, even if apart', () => {
    const { matches, exclamations } = punctuationMatches('Hi! Big news!', 1)
    expect(exclamations).toBe(2)
    expect(matches.map((m) => m.text)).toEqual(['!', '!'])
  })
  it('allows a single exclamation mark', () => {
    expect(punctuationMatches('Big news!', 1).matches).toEqual([])
  })
})

describe('findTerms', () => {
  const terms = [
    { term: 'free', severity: 'warn' as const, pack: 'general-spam' },
    { term: 'free money', severity: 'critical' as const, pack: 'general-spam' },
    { term: "can't lose", severity: 'critical' as const, pack: 'financial-promotions' },
  ]
  it('matches whole words and phrases case-insensitively with ranges', () => {
    const m = findTerms('Get FREE stuff', terms)
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ text: 'FREE', start: 4, end: 8, kind: 'spam', severity: 'warn' })
  })
  it('does not match inside another word', () => {
    expect(findTerms('Carefree weekend, freedom', terms)).toEqual([])
  })
  it('prefers the longer phrase when two overlap', () => {
    const m = findTerms('free money inside', terms)
    expect(m.map((x) => x.text)).toEqual(['free money'])
  })
  it('treats curly apostrophes like straight ones without shifting offsets', () => {
    const m = findTerms('You can’t lose here', terms)
    expect(m).toHaveLength(1)
    expect(m[0].text).toBe('can’t lose')
  })
  it('matches a phrase across several spaces', () => {
    expect(findTerms('free   money', terms).map((x) => x.text)).toEqual(['free   money'])
  })
})

import { truncateGraphemes } from '../engine/text'

describe('truncateGraphemes', () => {
  it('cuts at a character limit without splitting an emoji or flag', () => {
    expect(truncateGraphemes('abc', 5)).toBe('abc')
    expect(truncateGraphemes('Sale 🇿🇦🇿🇦', 6)).toBe('Sale 🇿🇦')
    expect(truncateGraphemes('👍🏽👍🏽👍🏽', 2)).toBe('👍🏽👍🏽')
  })
})
