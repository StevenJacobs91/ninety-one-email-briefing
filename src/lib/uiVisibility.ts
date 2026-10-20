export type VisibilityKey =
  | 'showDistributionListDropzone'
  | 'showPardotProspectHealth'
  | 'showCopyHtml'
  | 'showSendTestEmail'
  | 'showSubmitToPardot'

export const VISIBILITY_OPTIONS: readonly { key: VisibilityKey; tab: 'Campaign' | 'Review and Submission'; label: string; hint: string }[] = [
  { key: 'showDistributionListDropzone', tab: 'Campaign', label: 'Distribution list drag & drop area', hint: 'Lists already added stay visible' },
  { key: 'showPardotProspectHealth', tab: 'Campaign', label: 'Pardot list prospect health', hint: 'The Pardot list field stays; only the health panel is hidden' },
  { key: 'showCopyHtml', tab: 'Review and Submission', label: 'Copy HTML button', hint: 'Download HTML is unaffected' },
  { key: 'showSendTestEmail', tab: 'Review and Submission', label: 'Send Test Email', hint: 'The recipient field and send button' },
  { key: 'showSubmitToPardot', tab: 'Review and Submission', label: 'Submit to Pardot button', hint: 'Submit Brief & Template is unaffected' },
]

/** An item is shown unless it was explicitly saved as hidden, so older saved settings show everything. */
export function isShown(saved: Partial<Record<VisibilityKey, boolean>> | undefined, key: VisibilityKey): boolean {
  return saved?.[key] ?? true
}
