import type { RuleContext } from '../context'
import { findTerms } from '../text'
import { fail, pass, type Rule } from './types'

const YOU = /(?<![\p{L}\p{N}])you(?:r|rs|rself)?(?![\p{L}\p{N}])/iu

function hasHook(ctx: RuleContext): boolean {
  if (/\d/.test(ctx.rendered) || ctx.rendered.includes('?') || ctx.tags.length > 0 || YOU.test(ctx.rendered)) return true
  const hooks = ctx.deps.lexicon.getHookTerms().map((term) => ({ term, severity: 'warn' as const, pack: 'hooks' }))
  return findTerms(ctx.rendered, hooks).length > 0
}

export const wordingRules: Rule[] = [
  {
    id: 'WRD-01',
    category: 'wording',
    label: 'No spam triggers',
    run: ({ spamMatches }) =>
      spamMatches.length === 0
        ? pass
        : fail(
            `Contains ${spamMatches.length === 1 ? 'a spam or compliance trigger' : 'spam or compliance triggers'}: ${spamMatches.map((m) => `"${m.text}"`).join(', ')}.`,
            'Replace the flagged phrase(s).',
            spamMatches,
          ),
  },
  {
    id: 'WRD-02',
    category: 'wording',
    label: 'Restrained capitals',
    run: ({ capsMatches, config }) =>
      capsMatches.length <= config.thresholds.capsWordsMax
        ? pass
        : fail(
            `${capsMatches.length} ALL-CAPS words (${capsMatches.map((m) => m.text).join(', ')}); at most ${config.thresholds.capsWordsMax} allowed.`,
            'Use sentence or title case; keep caps for one word at most.',
            capsMatches,
          ),
  },
  {
    id: 'WRD-03',
    category: 'wording',
    label: 'Restrained punctuation',
    run: ({ punctuation, exclamations, config }) => {
      if (punctuation.length === 0 && exclamations <= config.thresholds.exclamationsMax) return pass
      const runs = punctuation.filter((m) => m.text.length > 1)
      const reason =
        runs.length > 0
          ? `Repeated punctuation (${runs.map((m) => `"${m.text}"`).join(', ')}).`
          : `${exclamations} exclamation marks; at most ${config.thresholds.exclamationsMax} allowed.`
      return fail(reason, 'Use one exclamation mark at most.', punctuation)
    },
  },
  {
    id: 'WRD-04',
    category: 'wording',
    label: 'Has a hook',
    run: (ctx) =>
      hasHook(ctx)
        ? pass
        : fail(
            'No number, question, personalisation, direct address or action word to draw the reader in.',
            'Add a number, a question, a clear action, or speak to the reader directly.',
          ),
  },
]
