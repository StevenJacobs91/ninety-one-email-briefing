import type { RuleContext } from '../context'
import type { CategoryId, Match } from '../types'

export interface RuleOutcome {
  passed: boolean
  reason?: string
  tip?: string
  matches?: Match[]
}

export interface Rule {
  id: string
  category: CategoryId
  label: string
  run(ctx: RuleContext): RuleOutcome
}

export const pass: RuleOutcome = { passed: true }
export const fail = (reason: string, tip: string, matches?: Match[]): RuleOutcome => ({ passed: false, reason, tip, ...(matches ? { matches } : {}) })
