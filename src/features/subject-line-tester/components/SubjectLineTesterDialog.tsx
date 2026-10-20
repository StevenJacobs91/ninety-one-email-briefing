import { useEffect, useRef, useState } from 'react'
import type { PartialTesterConfig } from '../engine/config'
import type { AnalyzerDeps } from '../engine/context'
import { SubjectLineTester } from './SubjectLineTester'
import type { SubjectFields } from './SubjectInput'

interface Props {
  initial: SubjectFields
  deps?: AnalyzerDeps
  config?: PartialTesterConfig
  onClose: () => void
  /** When given, shows "Apply to brief", which hands back the edited subject line. */
  onApplySubject?: (subject: string) => void
}

/** The full tester in a dialog, pre-filled. Escape closes it; focus returns to whatever opened it. */
export function SubjectLineTesterDialog({ initial, deps, config, onClose, onApplySubject }: Props) {
  const [fields, setFields] = useState<SubjectFields>(initial)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('input')?.focus()
    return () => opener?.focus?.()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slt-dialog-title"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-gray-900 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="slt-dialog-title" className="font-ni-display text-xl text-brand-primary dark:text-gray-100">Subject Line Tester</h2>
          <button type="button" onClick={onClose} aria-label="Close the subject line tester" className="px-2 text-2xl leading-none text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary">
            &times;
          </button>
        </div>
        <SubjectLineTester initial={initial} deps={deps} config={config} onChange={setFields} />
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            Close
          </button>
          {onApplySubject && (
            <button
              type="button"
              onClick={() => { onApplySubject(fields.subject); onClose() }}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
            >
              Apply to brief
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
