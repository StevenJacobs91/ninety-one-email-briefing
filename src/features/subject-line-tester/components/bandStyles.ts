import type { Band } from '../engine/types'

export const BAND_LABEL: Record<Band, string> = { great: 'Great', good: 'Good', 'needs-work': 'Needs work' }

export const BAND_STYLE: Record<Band, { stroke: string; text: string }> = {
  great: { stroke: 'stroke-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  good: { stroke: 'stroke-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  'needs-work': { stroke: 'stroke-red-500', text: 'text-red-700 dark:text-red-400' },
}
