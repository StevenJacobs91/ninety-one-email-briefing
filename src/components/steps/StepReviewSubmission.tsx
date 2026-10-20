import { StepReview } from './StepReview'
import { StepHtmlReview } from './StepHtmlReview'

interface Props {
  onExport: (mode: 'download' | 'clipboard') => void
  exportStatus: 'idle' | 'success' | 'error'
  onComplete: () => void
  blocked: boolean
  blockReason: string | null
}

// Tab 3. The brief summary and export controls that used to be their own step
// are folded in, collapsed, above the rendered email and submit controls.
export function StepReviewSubmission({ onExport, exportStatus, onComplete, blocked, blockReason }: Props) {
  return (
    <div className="space-y-8">
      <details className="border border-brand-border-warm dark:border-gray-700 group">
        <summary className="cursor-pointer select-none px-5 py-3 text-xs tracking-[0.15em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
          Brief summary and export
        </summary>
        <div className="px-5 pb-6">
          <StepReview onSubmit={onExport} submitStatus={exportStatus} />
        </div>
      </details>
      <StepHtmlReview onComplete={onComplete} blocked={blocked} blockReason={blockReason} />
    </div>
  )
}
