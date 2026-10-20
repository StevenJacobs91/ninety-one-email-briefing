import type { SampleContactProvider } from '../SampleContactProvider'
import data from '../../data/sample-contact.json'

/** Synthetic values only. Never load real contact records here. */
export function createMockSampleContactProvider(fields: Record<string, string> = data.fields): SampleContactProvider {
  return { getSampleValue: (field) => fields[field] ?? '' }
}
