import type { BriefTabId } from './briefTabs'

export interface GateInput {
  score: number
  minimumScore: number
  aiMode: string
  aiStatus: string
  aiRejected: boolean
}

export interface GateResult {
  blocked: boolean
  reason: string | null
}

export function evaluateGate(i: GateInput): GateResult {
  if (i.score < i.minimumScore) {
    return { blocked: true, reason: `Brand score is ${i.score}%; a minimum of ${i.minimumScore}% is required to submit.` }
  }
  if (i.aiMode !== 'pre-submission') return { blocked: false, reason: null }
  if (i.aiStatus !== 'success') {
    return { blocked: true, reason: 'The AI review has not finished; it must pass before submitting.' }
  }
  if (i.aiRejected) {
    return { blocked: true, reason: 'The AI Brand Guardian rejected this brief. Address the issues and re-run the AI review.' }
  }
  return { blocked: false, reason: null }
}

const TAB_BY_PREFIX: ReadonlyArray<[string, BriefTabId]> = [
  ['campaign', 'campaign'],
  ['audience', 'campaign'],
  ['assets', 'campaign'],
  ['deadlines', 'campaign'],
  ['content', 'content'],
]

export function fieldToTab(field: string): BriefTabId | null {
  for (const [prefix, tab] of TAB_BY_PREFIX) if (field.startsWith(prefix)) return tab
  return null
}

export function shouldAutoRunAI(i: { aiMode: string; aiAvailable: boolean; aiStatus: string; onReviewTab: boolean }): boolean {
  return i.onReviewTab
    && i.aiAvailable
    && i.aiStatus === 'idle'
    && (i.aiMode === 'pre-submission' || i.aiMode === 'post-submission')
}
