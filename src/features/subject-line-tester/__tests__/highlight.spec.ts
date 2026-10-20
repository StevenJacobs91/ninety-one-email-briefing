import { describe, expect, it } from 'vitest'
import { highlightSegments } from '../components/highlightSegments'

const m = (start: number, end: number, kind: 'spam' | 'caps' | 'punctuation', text: string) => ({ start, end, kind, text })

describe('highlightSegments', () => {
  it('returns one plain segment when nothing is flagged', () => {
    expect(highlightSegments('Hello world', [])).toEqual([{ text: 'Hello world', kinds: [] }])
  })

  it('splits text around a flagged range and keeps every character', () => {
    const segs = highlightSegments('Get FREE stuff', [m(4, 8, 'spam', 'FREE')])
    expect(segs).toEqual([
      { text: 'Get ', kinds: [] },
      { text: 'FREE', kinds: ['spam'] },
      { text: ' stuff', kinds: [] },
    ])
    expect(segs.map((s) => s.text).join('')).toBe('Get FREE stuff')
  })

  it('layers overlapping flags on the characters they share', () => {
    const segs = highlightSegments('FREE MONEY!!!', [m(0, 10, 'spam', 'FREE MONEY'), m(0, 4, 'caps', 'FREE'), m(10, 13, 'punctuation', '!!!')])
    expect(segs).toEqual([
      { text: 'FREE', kinds: ['spam', 'caps'] },
      { text: ' MONEY', kinds: ['spam'] },
      { text: '!!!', kinds: ['punctuation'] },
    ])
  })

  it('ignores ranges outside the text', () => {
    expect(highlightSegments('abc', [m(5, 9, 'spam', 'x')])).toEqual([{ text: 'abc', kinds: [] }])
  })

  it('returns nothing for empty text', () => {
    expect(highlightSegments('', [])).toEqual([])
  })
})
