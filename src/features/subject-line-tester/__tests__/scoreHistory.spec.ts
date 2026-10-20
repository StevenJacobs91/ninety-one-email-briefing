import { describe, expect, it } from 'vitest'
import { appendScore, chartPoints, describeHistory, type ScorePoint } from '../components/scoreHistory'

const p = (score: number, subject = `s${score}`): ScorePoint => ({ score, subject })

describe('appendScore', () => {
  it('adds a point for a new subject', () => {
    expect(appendScore([p(60)], 83, 'better')).toEqual([p(60), { score: 83, subject: 'better' }])
  })

  it('ignores an empty subject and a repeat of the last subject', () => {
    expect(appendScore([], 0, '')).toEqual([])
    expect(appendScore([], 50, '   ')).toEqual([])
    const history = [p(60, 'same')]
    expect(appendScore(history, 60, 'same')).toBe(history)
  })

  it('keeps a point when the score is unchanged but the subject is different', () => {
    expect(appendScore([p(60, 'a')], 60, 'b')).toHaveLength(2)
  })

  it('keeps only the most recent points', () => {
    let h: ScorePoint[] = []
    for (let i = 0; i < 30; i++) h = appendScore(h, i, `s${i}`, 20)
    expect(h).toHaveLength(20)
    expect(h[0].subject).toBe('s10')
    expect(h[19].subject).toBe('s29')
  })

  it('does not mutate the history it is given', () => {
    const h = Object.freeze([p(60)]) as ScorePoint[]
    expect(() => appendScore(h, 70, 'x')).not.toThrow()
    expect(h).toHaveLength(1)
  })
})

describe('chartPoints', () => {
  it('spreads points across the width, inset so the end dots are not clipped, and maps score to height (100 at the top)', () => {
    const pts = chartPoints([p(0), p(50), p(100)])
    expect(pts.map((x) => x.x)).toEqual([4, 50, 96])
    expect(pts.map((x) => x.y)).toEqual([100, 50, 0])
  })

  it('puts a single point in the middle', () => {
    expect(chartPoints([p(80)])[0].x).toBe(50)
  })

  it('returns nothing for no history', () => {
    expect(chartPoints([])).toEqual([])
  })
})

describe('describeHistory', () => {
  it('summarises the trend for screen readers', () => {
    expect(describeHistory([p(60), p(75), p(83)])).toBe('3 tests, from 60 to 83 percent.')
  })
  it('handles one test and none', () => {
    expect(describeHistory([p(83)])).toBe('1 test so far.')
    expect(describeHistory([])).toBe('No tests yet.')
  })
})
