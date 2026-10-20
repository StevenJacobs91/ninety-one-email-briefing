import { z } from 'zod'

const ThresholdsSchema = z
  .object({
    /** LEN-01: at least this many characters */
    lengthMin: z.number().int().nonnegative(),
    /** LEN-02: at most this many characters to fit a desktop inbox */
    desktopMax: z.number().int().positive(),
    /** LEN-03: at most this many characters to fit a mobile inbox */
    mobileMax: z.number().int().positive(),
    /** LEN-04: word count range */
    wordsMin: z.number().int().nonnegative(),
    wordsMax: z.number().int().positive(),
    /** WRD-02: at most this many ALL-CAPS words */
    capsWordsMax: z.number().int().nonnegative(),
    /** WRD-02: a word needs at least this many letters to count as ALL-CAPS */
    capsMinLetters: z.number().int().positive(),
    /** WRD-03: at most this many exclamation marks */
    exclamationsMax: z.number().int().nonnegative(),
    /** SCN-01: at most this many emoji */
    emojiMax: z.number().int().nonnegative(),
    /** SCN-04: no word longer than this, and the average no longer than avgWordMax */
    longestWordMax: z.number().int().positive(),
    avgWordMax: z.number().positive(),
  })
  .refine((t) => t.wordsMin <= t.wordsMax, { message: 'wordsMin must not exceed wordsMax' })
  .refine((t) => t.mobileMax <= t.desktopMax, { message: 'mobileMax must not exceed desktopMax' })

export const TesterConfigSchema = z.object({
  /** Highest score allowed when a critical check fails */
  criticalCap: z.number().int().min(0).max(100),
  /** Check ids treated as critical */
  criticalChecks: z.array(z.string()),
  /** Minimum score for each band; below `good` is "needs work" */
  bands: z
    .object({ great: z.number().int().min(1).max(100), good: z.number().int().min(1).max(100) })
    .refine((b) => b.great > b.good, { message: 'bands.great must be higher than bands.good' }),
  /** Hard input limit used by the UI */
  maxSubjectLength: z.number().int().positive(),
  thresholds: ThresholdsSchema,
  /** Per-check weight; checks not listed weigh 1 */
  weights: z.record(z.string(), z.number().positive()),
  /** Lexicon packs whose terms are checked by WRD-01 */
  lexiconPacks: z.array(z.string()),
  /** Characters visible in the preview before the subject is cut off */
  preview: z.object({ desktopChars: z.number().int().positive(), mobileChars: z.number().int().positive() }),
})

export type TesterConfig = z.infer<typeof TesterConfigSchema>

type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] }
export type PartialTesterConfig = DeepPartial<TesterConfig>

const DEFAULTS: TesterConfig = {
  criticalCap: 60,
  criticalChecks: ['WRD-01'],
  bands: { great: 90, good: 70 },
  maxSubjectLength: 150,
  thresholds: {
    lengthMin: 20,
    desktopMax: 60,
    mobileMax: 40,
    wordsMin: 3,
    wordsMax: 9,
    capsWordsMax: 1,
    capsMinLetters: 3,
    exclamationsMax: 1,
    emojiMax: 2,
    longestWordMax: 15,
    avgWordMax: 7,
  },
  weights: {},
  lexiconPacks: ['general-spam', 'financial-promotions'],
  preview: { desktopChars: 60, mobileChars: 40 },
}

export const DEFAULT_CONFIG: TesterConfig = TesterConfigSchema.parse(DEFAULTS)

/** Merges a partial config over the defaults and validates it. Throws on an invalid config. */
export function resolveConfig(partial: PartialTesterConfig = {}): TesterConfig {
  const merged = {
    ...DEFAULTS,
    ...partial,
    bands: { ...DEFAULTS.bands, ...partial.bands },
    thresholds: { ...DEFAULTS.thresholds, ...partial.thresholds },
    weights: { ...DEFAULTS.weights, ...partial.weights },
    preview: { ...DEFAULTS.preview, ...partial.preview },
  }
  return TesterConfigSchema.parse(merged)
}
