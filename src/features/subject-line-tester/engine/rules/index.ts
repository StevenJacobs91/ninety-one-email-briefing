import { lengthRules } from './length'
import { scannabilityRules } from './scannability'
import { wordingRules } from './wording'
import type { Rule } from './types'

/** The rule registry. Add a check by adding a rule here; analyze.ts does not change. */
export const RULES: readonly Rule[] = [...lengthRules, ...wordingRules, ...scannabilityRules]
export type { Rule, RuleOutcome } from './types'
