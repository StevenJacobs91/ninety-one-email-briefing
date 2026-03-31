import { useState, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { FieldText } from '../ui/FieldText'
import { FieldTextarea } from '../ui/FieldTextarea'
import { URGENCY_OPTIONS, BRAND_THEMES } from '../../lib/constants'
import { BriefSummary } from '../ui/BriefSummary'
import { PrintBrief } from '../ui/PrintBrief'

interface StepDeadlinesProps {
  onSubmit: (mode: 'download' | 'clipboard') => void
  submitStatus: 'idle' | 'success' | 'error'
}

function buildTags(data: BriefFormData): string {
  const emailName = (() => {
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(-2)
    const regionPart = (data.audience.region ?? []).length > 0 ? (data.audience.region ?? []).join(' ') : 'tbd'
    const audiencePart = (data.audience.channel ?? []).length > 0 ? (data.audience.channel ?? []).join(' ') : 'tbd'
    const namePart = data.campaign.campaignName || 'untitled'
    return `${mm}${yy} ${regionPart} ${audiencePart} ${namePart}`.toLowerCase()
  })()

  const themeLabel = BRAND_THEMES.find((t) => t.id === data.campaign.theme)?.label ?? data.campaign.theme ?? ''

  const tags = [
    `parent - ${emailName}`,
    'email - primary',
    `client group - ${(data.audience.clientGroup ?? []).join(' ').toLowerCase()}`,
    `region - ${(data.audience.region ?? []).join(' ').toLowerCase()}`,
    `audience - ${(data.audience.channel ?? []).join(' ').toLowerCase()}`,
    `campaign - ${(data.campaign.campaignName || 'untitled').toLowerCase()}`,
    `email type - ${(data.campaign.emailType || '').toLowerCase()}`,
    `colour theme - ${themeLabel.toLowerCase().replace(/\s*\/\s*/g, ' and ')}`,
  ]
  return tags.join(', ')
}

export function StepDeadlines({ onSubmit, submitStatus }: StepDeadlinesProps) {
  const form = useFormContext<BriefFormData>()
  const { register, watch, setValue, formState: { errors } } = form
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [tagsCopied, setTagsCopied] = useState(false)

  const notes = watch('deadlines.notes') ?? ''
  const contentApprovalDate = watch('deadlines.contentApprovalDate') ?? ''
  const today = new Date().toISOString().split('T')[0]
  const data = watch()

  // Compute tags from form data
  const tags = useMemo(() => buildTags(data as BriefFormData), [data])

  // Keep tags field in sync for JSON export
  useState(() => {
    setValue('deadlines.tags', tags)
  })

  async function copyTags() {
    try {
      await navigator.clipboard.writeText(tags)
      setTagsCopied(true)
      setTimeout(() => setTagsCopied(false), 2000)
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div>
      <h2 className="font-ni-display text-brand-primary dark:text-gray-100 text-2xl mb-8">Deadlines</h2>

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
                      : 'bg-brand-primary text-white border-brand-primary'
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
                    ? 'bg-brand-primary text-white border-brand-primary'
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

      {/* Auto-generated Tags */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Auto-generated Tags
          </label>
          <button
            type="button"
            onClick={copyTags}
            className="text-xs text-brand-primary dark:text-brand-accent hover:underline font-medium flex items-center gap-1"
          >
            {tagsCopied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy tags
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Comma-separated tags for use in your email marketing platform.
        </p>
        <div className="px-3 py-2.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400 select-all leading-relaxed font-mono break-all">
          {tags || '—'}
        </div>
      </div>

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

      {/* Print content (injected into #print-brief portal for @media print) */}
      <PrintBrief data={data as BriefFormData} />

      {submitStatus === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400 -mt-4 mb-4 text-center">Brief exported successfully.</p>
      )}
      {submitStatus === 'error' && (
        <p className="text-sm text-red-600 dark:text-red-400 -mt-4 mb-4 text-center">Export failed. Please try again.</p>
      )}
    </div>
  )
}
