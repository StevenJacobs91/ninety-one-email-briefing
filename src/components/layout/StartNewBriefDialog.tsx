import { useEffect, useRef } from 'react'

interface StartNewBriefDialogProps {
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before throwing away the brief being worked on. Cancel has focus, so Enter never discards by accident. */
export function StartNewBriefDialog({ onConfirm, onCancel }: StartNewBriefDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onCancel} aria-hidden="true" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="start-new-brief-title"
          aria-describedby="start-new-brief-body"
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 id="start-new-brief-title" className="font-ni-display text-brand-primary dark:text-brand-accent text-lg">
              Start a new brief?
            </h2>
          </div>
          <div id="start-new-brief-body" className="px-6 py-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>This clears the brief and the email you are building, and starts again from a blank brief.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Briefs you have already submitted and drafts you saved are not affected.
            </p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-brand-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Start new brief
            </button>
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
