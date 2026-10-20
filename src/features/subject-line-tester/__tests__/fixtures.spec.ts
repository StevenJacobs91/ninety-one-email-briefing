import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import fixtures from '../data/fixtures.json'
import { analyzeSubjectLine } from '../engine/analyze'
import { deps } from './helpers'

const FixtureSchema = z.object({
  id: z.string(),
  subject: z.string(),
  config: z.record(z.unknown()).optional(),
  expect: z.object({
    score: z.number(),
    failures: z.array(z.string()),
    capped: z.boolean(),
    empty: z.boolean().optional(),
    chars: z.number().optional(),
    rendered: z.string().optional(),
  }),
})
const all = z.array(FixtureSchema).parse(fixtures)

describe('fixtures', () => {
  it('has at least 20 fixtures with unique ids', () => {
    expect(all.length).toBeGreaterThanOrEqual(20)
    expect(new Set(all.map((f) => f.id)).size).toBe(all.length)
  })

  it('covers every check passing and failing at least once', () => {
    const ids = ['LEN-01', 'LEN-02', 'LEN-03', 'LEN-04', 'WRD-01', 'WRD-02', 'WRD-03', 'WRD-04', 'SCN-01', 'SCN-02', 'SCN-03', 'SCN-04']
    const failing = new Set(all.flatMap((f) => (f.expect.empty ? [] : f.expect.failures)))
    for (const id of ids) {
      expect(failing.has(id), `${id} never fails in a fixture`).toBe(true)
      const passesSomewhere = all.some((f) => !f.expect.empty && !f.expect.failures.includes(id))
      expect(passesSomewhere, `${id} never passes in a fixture`).toBe(true)
    }
  })

  describe.each(all)('$id', (f) => {
    it('scores and fails exactly as expected', () => {
      const r = analyzeSubjectLine({ subject: f.subject }, deps, f.config as never)
      const failures = r.categories.flatMap((c) => c.checks).filter((c) => !c.passed).map((c) => c.id)
      if (f.expect.empty) {
        expect(r.empty).toBe(true)
        expect(r.score).toBe(0)
        return
      }
      expect(failures).toEqual(f.expect.failures)
      expect(r.score).toBe(f.expect.score)
      expect(r.cappedByCritical).toBe(f.expect.capped)
      if (f.expect.chars !== undefined) expect(r.metrics.chars).toBe(f.expect.chars)
      if (f.expect.rendered !== undefined) expect(r.rendered).toBe(f.expect.rendered)
    })
  })
})
