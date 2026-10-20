import type { MergeTagSyntax } from '../MergeTagSyntax'
import data from '../../data/sample-contact.json'

/** Pardot / Account Engagement HML, e.g. {{Recipient.FirstName}}. */
export function createMockMergeTagSyntax(knownFields: readonly string[] = Object.keys(data.fields)): MergeTagSyntax {
  const known = new Set(knownFields)
  return {
    pattern: /\{\{\s*([\w.]+)\s*\}\}/g,
    isKnownField: (field) => known.has(field),
    placeholderPatterns: [/\[[A-Za-z][A-Za-z _]*\]/g, /\*\|[^|]+\|\*/g],
  }
}
