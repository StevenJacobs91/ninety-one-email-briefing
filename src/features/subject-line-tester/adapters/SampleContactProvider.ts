export interface SampleContactProvider {
  /** A synthetic value for a merge field, e.g. Recipient.FirstName -> "Alexandra". Never a real contact. */
  getSampleValue(field: string): string
}
