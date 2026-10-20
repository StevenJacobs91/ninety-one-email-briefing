import { resolveConfig, type PartialTesterConfig, type TesterConfig } from './config'
import { buildContext, type AnalyzerDeps } from './context'
import { RULES } from './rules'
import {
  AnalysisResultSchema,
  type AnalysisInput,
  type AnalysisResult,
  type Band,
  type CategoryId,
  type CategoryResult,
  type CheckResult,
} from './types'

const CATEGORY_LABELS: Record<CategoryId, string> = { length: 'Length', wording: 'Wording', scannability: 'Scannability' }
const CATEGORY_ORDER: CategoryId[] = ['length', 'wording', 'scannability']

export function bandFor(score: number, bands: TesterConfig['bands']): Band {
  if (score >= bands.great) return 'great'
  if (score >= bands.good) return 'good'
  return 'needs-work'
}

function groupByCategory(checks: CheckResult[]): CategoryResult[] {
  return CATEGORY_ORDER.map((id) => {
    const inCategory = checks.filter((c) => c.category === id)
    return { id, label: CATEGORY_LABELS[id], passed: inCategory.filter((c) => c.passed).length, total: inCategory.length, checks: inCategory }
  })
}

function emptyResult(config: TesterConfig): AnalysisResult {
  const checks: CheckResult[] = RULES.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    passed: false,
    critical: config.criticalChecks.includes(r.id),
    reason: 'There is no subject line to check yet.',
    tip: 'Start typing a subject line.',
  }))
  return {
    empty: true,
    score: 0,
    band: 'needs-work',
    cappedByCritical: false,
    rendered: '',
    metrics: { chars: 0, words: 0, emojiCount: 0, capsWords: 0, exclamations: 0, flaggedTerms: 0 },
    categories: groupByCategory(checks),
  }
}

/**
 * Scores a subject line. Pure and synchronous: no React, DOM or network, and the same
 * input, deps and config always give a deep-equal result.
 */
export function analyzeSubjectLine(input: AnalysisInput, deps: AnalyzerDeps, config?: PartialTesterConfig): AnalysisResult {
  const cfg = resolveConfig(config)
  if (input.subject.trim() === '') return emptyResult(cfg)

  const ctx = buildContext(input, deps, cfg)
  const checks: CheckResult[] = RULES.map((rule) => {
    const outcome = rule.run(ctx)
    return {
      id: rule.id,
      category: rule.category,
      label: rule.label,
      passed: outcome.passed,
      critical: cfg.criticalChecks.includes(rule.id),
      ...(outcome.passed ? {} : { reason: outcome.reason, tip: outcome.tip }),
      ...(outcome.matches ? { matches: outcome.matches } : {}),
    }
  })

  const weight = (id: string) => cfg.weights[id] ?? 1
  const totalWeight = checks.reduce((n, c) => n + weight(c.id), 0)
  const passedWeight = checks.filter((c) => c.passed).reduce((n, c) => n + weight(c.id), 0)
  const rawScore = Math.round((passedWeight / totalWeight) * 100)

  const criticalFailed = checks.some((c) => c.critical && !c.passed)
  const score = criticalFailed ? Math.min(rawScore, cfg.criticalCap) : rawScore

  return AnalysisResultSchema.parse({
    empty: false,
    score,
    band: bandFor(score, cfg.bands),
    cappedByCritical: criticalFailed,
    rendered: ctx.rendered,
    metrics: {
      chars: ctx.chars,
      words: ctx.words.length,
      emojiCount: ctx.emoji.length,
      capsWords: ctx.capsMatches.length,
      exclamations: ctx.exclamations,
      flaggedTerms: ctx.spamMatches.length,
    },
    categories: groupByCategory(checks),
  })
}
