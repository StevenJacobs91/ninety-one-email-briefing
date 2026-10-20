import { describe, expect, it } from 'vitest'
import { analyzeSubjectLine } from '../engine/analyze'
import { deps } from './helpers'

// Spec 5.1: analysis completes in under 5 ms for a 150-character input.
describe('performance', () => {
  it('analyses a 150-character subject in under 5 ms on average', () => {
    const subject = `Hi {{Recipient.FirstName}}, ${'your portfolio outlook for the next quarter '.repeat(4)}`.slice(0, 150)
    expect(subject).toHaveLength(150)
    analyzeSubjectLine({ subject }, deps) // warm up
    const runs = 200
    const start = performance.now()
    for (let i = 0; i < runs; i++) analyzeSubjectLine({ subject }, deps)
    const average = (performance.now() - start) / runs
    expect(average).toBeLessThan(5)
  })
})
