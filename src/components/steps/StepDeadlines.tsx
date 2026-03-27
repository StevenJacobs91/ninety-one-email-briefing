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

  const notes = watch('deadlines.notes') ?? ''
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
      />

      <FieldText
        label="Send Date"
        registration={register('deadlines.sendDate')}
        error={errors.deadlines?.sendDate}
        required
        type="date"
      />

      {/* Urgency */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgency<span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="flex gap-3">
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
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          1-1 Required?
        </label>
        <div className="flex gap-3">
          {(['yes', 'no'] as const).map((opt) => {
            const isYes = opt === 'yes'
            const selected = isYes ? watch('deadlines.oneOnOneRequired') === true : watch('deadlines.oneOnOneRequired') === false
            return (
              <label
                key={opt}
                className={`flex-1 text-center py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#134848] text-white border-[#134848]'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
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

      {/* Brief Summary */}
      <div className="mt-8 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Review Your Brief</h3>
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <BriefSummary data={data as BriefFormData} />
        </div>
      </div>

      {/* Submit controls */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSubmit('download')}
          className="flex-1 bg-[#134848] text-white py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#0d3232] transition-colors"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => onSubmit('clipboard')}
          className="flex-1 border border-[#134848] text-[#134848] py-2.5 px-4 rounded-md text-sm font-medium hover:bg-[#134848]/5 transition-colors"
        >
          Copy to Clipboard
        </button>
      </div>

      {submitStatus === 'success' && (
        <p className="text-sm text-green-600 mt-3 text-center">Brief exported successfully.</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-red-600 mt-3 text-center">Export failed. Please try again.</p>
      )}
    </div>
  )
}
