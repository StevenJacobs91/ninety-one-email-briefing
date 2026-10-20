import { useId } from 'react'
import { DEFAULT_CONFIG } from '../engine/config'
import { charCount, truncateGraphemes } from '../engine/text'

export interface SubjectFields {
  subject: string
  senderName: string
  preheader: string
}

interface Props {
  value: SubjectFields
  onChange: (next: SubjectFields) => void
  maxLength?: number
  /** Shows a "Test now" button that runs the analysis immediately (the standalone page). */
  onTestNow?: () => void
}

const INPUT =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
const LABEL = 'mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'

export function SubjectInput({ value, onChange, maxLength = DEFAULT_CONFIG.maxSubjectLength, onTestNow }: Props) {
  const id = useId()
  const used = charCount(value.subject)
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${id}-subject`} className={LABEL}>Subject line</label>
        <input
          id={`${id}-subject`}
          type="text"
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: truncateGraphemes(e.target.value, maxLength) })}
          aria-describedby={`${id}-count`}
          autoComplete="off"
          placeholder="Type your subject line"
          className={INPUT}
        />
        <div className="mt-1 flex items-center justify-between">
          <span id={`${id}-count`} className={`text-xs tabular-nums ${used >= maxLength ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {used} / {maxLength} characters
          </span>
          {onTestNow && (
            <button
              type="button"
              onClick={onTestNow}
              className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
            >
              Test now
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-sender`} className={LABEL}>Sender name <span className="font-normal text-gray-400">(preview only)</span></label>
          <input id={`${id}-sender`} type="text" value={value.senderName} onChange={(e) => onChange({ ...value, senderName: e.target.value })} placeholder="e.g. Ninety One" className={INPUT} />
        </div>
        <div>
          <label htmlFor={`${id}-preheader`} className={LABEL}>Preheader text <span className="font-normal text-gray-400">(preview only)</span></label>
          <input id={`${id}-preheader`} type="text" value={value.preheader} onChange={(e) => onChange({ ...value, preheader: e.target.value })} placeholder="Appears after the subject" className={INPUT} />
        </div>
      </div>
    </div>
  )
}
