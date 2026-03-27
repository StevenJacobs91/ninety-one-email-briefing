import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { URGENCY_OPTIONS } from '../../lib/constants'
import { BriefSummary } from '../ui/BriefSummary'

interface StepDeadlinesProps {
  onSubmit: (mode: 'download' | 'clipboard') => void
  submitStatus: 'idle' | 'success' | 'error'
}

export function StepDeadlines({ onSubmit, submitStatus }: StepDeadlinesProps) {
  const form = useFormContext<BriefFormData>()
  const { register, watch, formState: { errors } } = form
  const [summaryOpen, setSummaryOpen] = useState(false)

  const notes = watch('deadlines.notes') ?? ''
  const contentApprovalDate = watch('deadlines.contentApprovalDate') ?? ''
  const today = new Date().toISOString().split('T')[0]
  const data = watch()

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Deadlines</h2>

      <FieldText
        label="Content Approval Date"
        registration={register('deadlines.contentApprovalDate')}
        error={errors.deadlines?.contentApprovalDate}
        required
        type="date"
        min={today}
      />

      <FieldText
        label="Send Date"
        registration={register('deadlines.sendDate')}
        error={errors.deadlines?.sendDate}
        required
        type="date"
        min={contentApprovalDate || today}
      />

      {/* Urgency */}
      <div className="mb-4">
        <p id="urgency-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Urgency<span className="text-red-500 ml-0.5">*</span>
        </p>
        <div className="flex gap-3" role="radiogroup" aria-labelledby="urgency-label">
          {URGENCY_OPTIONS.map((opt) => {
            const selected = watch('deadlines.urgency') === opt
            return (
              <label
                key={opt}
                className={`flex-1 text-center py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
                  selected
                    ? opt === 'urgent'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-[#134848] text-white border-[#134848]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  {...register('deadlines.urgency')}
                  value={opt}
                  className="sr-only"
                />
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </label>
            )
          })}
        </div>
      </div>

      {/* 1-1 Required */}
      <div className="mb-4">
        <p id="one-on-one-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          1-1 Required?
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Does this email require a personalised one-to-one send (e.g. individual adviser targeting)?
        </p>
        <div className="flex gap-3" role="radiogroup" aria-labelledby="one-on-one-label">
          {(['yes', 'no'] as const).map((opt) => {
            const isYes = opt === 'yes'
            const selected = isYes ? watch('deadlines.oneOnOneRequired') === true : watch('deadlines.oneOnOneRequired') === false
            return (
              <label
                key={opt}
                className={`flex-1 text-center py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#134848] text-white border-[#134848]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  checked={selected}
                  onChange={() => {
                    form.setValue('deadlines.oneOnOneRequired', isYes, { shouldValidate: true })
                  }}
                  className="sr-only"
                />
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </label>
            )
          })}
        </div>
      </div>

      <FieldTextarea
        label="Notes"
        registration={register('deadlines.notes')}
        error={errors.deadlines?.notes}
        placeholder="Any additional notes (max 300 characters)"
        maxLength={300}
        currentLength={notes.length}
        rows={3}
      />

      {/* Collapsible Brief Summary */}
      <div className="mt-8 mb-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          aria-expanded={summaryOpen}
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Review Your Brief</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {summaryOpen && (
          <div className="p-5 bg-white dark:bg-gray-900">
            <BriefSummary data={data as BriefFormData} />
          </div>
        )}
      </div>

      {/* Export utilities — secondary actions */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Export brief data only:</p>
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => onSubmit('download')}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => onSubmit('clipboard')}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Copy JSON
        </button>
      </div>

      {submitStatus === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400 -mt-4 mb-4 text-center">Brief exported successfully.</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400 -mt-4 mb-4 text-center">Export failed. Please try again.</p>
      )}
    </div>
  )
}
