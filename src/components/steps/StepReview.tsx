import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { BriefSummary } from '../ui/BriefSummary'
import { PrintBrief } from '../ui/PrintBrief'
import { useSettings } from '../../contexts/SettingsContext'

interface StepReviewProps {
  onSubmit: (mode: 'download' | 'clipboard') => void
  submitStatus: 'idle' | 'success' | 'error'
}

export function StepReview({ onSubmit, submitStatus }: StepReviewProps) {
  const { watch } = useFormContext<BriefFormData>()
  const { settings } = useSettings()
  const data = watch()

  const showExport = settings.formFields.find((f) => f.id === 'review.exportOptions')?.visible !== false

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-2">Review your Brief</h2>
      <p className="text-sm text-brand-text-muted dark:text-gray-400 mb-8">Check all details before generating your email.</p>

      <BriefSummary data={data as BriefFormData} />

      {showExport && (
        <div className="mt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Export brief data:</p>
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              type="button"
              onClick={() => onSubmit('download')}
              className="flex-1 min-w-[100px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={() => onSubmit('clipboard')}
              className="flex-1 min-w-[100px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 min-w-[100px] border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Print / PDF
            </button>
          </div>
        </div>
      )}

      {submitStatus === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400 -mt-4 mb-4 text-center">Brief exported successfully.</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400 -mt-4 mb-4 text-center">Export failed. Please try again.</p>
      )}

      <PrintBrief data={data as BriefFormData} />
    </div>
  )
}
