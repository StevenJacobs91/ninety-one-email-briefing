import { z } from 'zod'

export const CategoryIdSchema = z.enum(['length', 'wording', 'scannability'])
export type CategoryId = z.infer<typeof CategoryIdSchema>

export const BandSchema = z.enum(['great', 'good', 'needs-work'])
export type Band = z.infer<typeof BandSchema>

export const SeveritySchema = z.enum(['critical', 'warn'])

export const LexiconTermSchema = z.object({
  term: z.string().min(1),
  severity: SeveritySchema,
  pack: z.string().min(1),
})
export type LexiconTerm = z.infer<typeof LexiconTermSchema>

/** A highlighted span. Offsets are UTF-16 code-unit offsets into `AnalysisResult.rendered` (so `rendered.slice(start, end) === text`). */
export const MatchSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  kind: z.enum(['spam', 'caps', 'punctuation']),
  text: z.string(),
  severity: SeveritySchema.optional(),
})
export type Match = z.infer<typeof MatchSchema>

export const CheckResultSchema = z.object({
  id: z.string(),
  category: CategoryIdSchema,
  label: z.string(),
  passed: z.boolean(),
  critical: z.boolean(),
  reason: z.string().optional(),
  tip: z.string().optional(),
  matches: z.array(MatchSchema).optional(),
})
export type CheckResult = z.infer<typeof CheckResultSchema>

export const CategoryResultSchema = z.object({
  id: CategoryIdSchema,
  label: z.string(),
  passed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  checks: z.array(CheckResultSchema),
})
export type CategoryResult = z.infer<typeof CategoryResultSchema>

export const MetricsSchema = z.object({
  chars: z.number().int().nonnegative(),
  words: z.number().int().nonnegative(),
  emojiCount: z.number().int().nonnegative(),
  capsWords: z.number().int().nonnegative(),
  exclamations: z.number().int().nonnegative(),
  flaggedTerms: z.number().int().nonnegative(),
})
export type Metrics = z.infer<typeof MetricsSchema>

export const AnalysisInputSchema = z.object({
  subject: z.string(),
  senderName: z.string().optional(),
  preheader: z.string().optional(),
})
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>

export const AnalysisResultSchema = z.object({
  /** True when there is no subject line to score; the UI shows its empty state. */
  empty: z.boolean(),
  score: z.number().int().min(0).max(100),
  band: BandSchema,
  cappedByCritical: z.boolean(),
  /** The subject with merge tags replaced by sample values; what a recipient sees. */
  rendered: z.string(),
  metrics: MetricsSchema,
  categories: z.array(CategoryResultSchema),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
