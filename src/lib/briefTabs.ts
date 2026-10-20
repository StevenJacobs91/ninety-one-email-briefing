import type { FormStepConfig } from '../types/settings.types'

export type BriefTabId = 'campaign' | 'content' | 'review'

// The brief has three fixed tabs. Saved settings may still hold the older
// three-step list (Campaign / Content / Brief Review), so reads normalise it.
export const BRIEF_TABS: readonly { id: BriefTabId; label: string }[] = [
  { id: 'campaign', label: 'Campaign' },
  { id: 'content', label: 'Layout & Content' },
  { id: 'review', label: 'Review and Submission' },
]

export function resolveTabs(_saved?: FormStepConfig[]): FormStepConfig[] {
  return BRIEF_TABS.map((t, order) => ({ ...t, order, visible: true }))
}

export function clampTab(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0))
}

export function mergeFormSteps(remote?: FormStepConfig[]): FormStepConfig[] {
  return resolveTabs(remote)
}
