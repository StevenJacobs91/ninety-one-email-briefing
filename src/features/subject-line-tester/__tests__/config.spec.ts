import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, resolveConfig } from '../engine/config'

describe('config', () => {
  it('ships the documented defaults', () => {
    expect(DEFAULT_CONFIG.criticalCap).toBe(60)
    expect(DEFAULT_CONFIG.bands).toEqual({ great: 90, good: 70 })
    expect(DEFAULT_CONFIG.thresholds.lengthMin).toBe(20)
    expect(DEFAULT_CONFIG.thresholds.desktopMax).toBe(60)
    expect(DEFAULT_CONFIG.thresholds.mobileMax).toBe(40)
    expect(DEFAULT_CONFIG.criticalChecks).toEqual(['WRD-01'])
    expect(DEFAULT_CONFIG.lexiconPacks).toEqual(['general-spam', 'financial-promotions'])
    expect(DEFAULT_CONFIG.maxSubjectLength).toBe(150)
  })

  it('merges a partial override over the defaults without losing the rest', () => {
    const c = resolveConfig({ thresholds: { mobileMax: 35 } })
    expect(c.thresholds.mobileMax).toBe(35)
    expect(c.thresholds.desktopMax).toBe(60)
    expect(c.criticalCap).toBe(60)
  })

  it('replaces arrays instead of merging them', () => {
    expect(resolveConfig({ lexiconPacks: ['general-spam'] }).lexiconPacks).toEqual(['general-spam'])
  })

  it('does not mutate the defaults', () => {
    resolveConfig({ thresholds: { mobileMax: 1 } })
    expect(DEFAULT_CONFIG.thresholds.mobileMax).toBe(40)
  })

  it('throws on an invalid config', () => {
    expect(() => resolveConfig({ bands: { great: 60, good: 80 } })).toThrow()
    expect(() => resolveConfig({ criticalCap: 150 })).toThrow()
    expect(() => resolveConfig({ thresholds: { wordsMin: 9, wordsMax: 3 } })).toThrow()
  })
})
