import type { FormStepConfig } from '../types/settings.types'

export type BriefTabId = 'build' | 'review'

// The brief has two fixed tabs: the brief and the email are built together, then reviewed. Saved settings may still hold an
// older three-step list (Campaign / Layout & Content / Review), so reads normalise it to these two.
export const BRIEF_TABS: readonly { id: BriefTabId; label: string }[] = [
  { id: 'build', label: 'Brief & Build' },
  { id: 'review', label: 'Review and Submission' },
]

/**
 * The tab a saved field belongs to. Fields were stored against the three steps Campaign (0), Layout & Content (1) and
 * Review (2); the first two are now one tab, so 0 and 1 are Brief & Build (order 0) and 2 is Review (order 1).
 */
export function tabOrderForStepIndex(stepIndex: number): number {
  return stepIndex >= 2 ? 1 : 0
}

export function resolveTabs(_saved?: FormStepConfig[]): FormStepConfig[] {
  return BRIEF_TABS.map((t, order) => ({ ...t, order, visible: true }))
}

export function mergeFormSteps(remote?: FormStepConfig[]): FormStepConfig[] {
  return resolveTabs(remote)
}
