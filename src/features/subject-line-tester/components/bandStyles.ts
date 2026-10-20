import type { Band } from '../engine/types'

export const BAND_LABEL: Record<Band, string> = { great: 'Great', good: 'Good', 'needs-work': 'Needs work' }

/** Ninety One palette: Ocean Teal, Leatherback Green, Gazania Gold. */
export const BAND_COLOUR: Record<Band, string> = { great: '#009d80', good: '#134848', 'needs-work': '#cf6f13' }

export const BAND_STYLE: Record<Band, { text: string }> = {
  great: { text: 'text-[#007a63] dark:text-[#2fc4a6]' },
  good: { text: 'text-[#134848] dark:text-[#7fb5b5]' },
  'needs-work': { text: 'text-[#a85a0f] dark:text-[#e8964a]' },
}
