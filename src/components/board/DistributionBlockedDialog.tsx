import { useState } from 'react'
import { DISTRIBUTION_BLOCK_MESSAGE, type DistributionBlockCode } from '../../lib/approvalRouting'

interface DistributionBlockedDialogProps {
  emailName: string
  code: DistributionBlockCode
  /** Admins may distribute anyway, with a reason that is kept on record */
  canOverride: boolean
  onClose: () => void
  /** Resolves when the card has been distributed; rejects with a message to show */
  onOverride: (reason: string) => Promise<void>
}

const MIN_REASON = 10

/** Shown when a card cannot be moved to Distributed because the team requires an approval it does not have. */
export function DistributionBlockedDialog({ emailName, code, canOverride, onClose, onOverride }: DistributionBlockedDialogProps) {
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const reasonOk = reason.trim().length >= MIN_REASON

  async function handleOverride() {
    if (!reasonOk) return
    setWorking(true)
    setError('')
    try {
      await onOverride(reason.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not distribute this brief.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="distribution-blocked-title"
          aria-describedby="distribution-blocked-reason"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2 id="distribution-blocked-title" className="font-ni-display text-brand-primary dark:text-brand-accent text-lg">
              This cannot be distributed yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{emailName}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p id="distribution-blocked-reason" className="text-sm text-gray-700 dark:text-gray-300">
              {DISTRIBUTION_BLOCK_MESSAGE[code]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your team requires approval before a brief is distributed. The card has been left where it was.
            </p>

            {canOverride && (
              <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                <label htmlFor="override-reason" className="text-xs font-medium text-gray-600 dark:text-gray-300 block">
                  Distribute anyway (admins only). Why? This is kept on record.
                </label>
                <textarea
                  id="override-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                />
                <p className="text-[11px] text-gray-400">At least {MIN_REASON} characters.</p>
              </div>
            )}

            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            {canOverride && (
              <button
                type="button"
                onClick={handleOverride}
                disabled={!reasonOk || working}
                className="flex-1 bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {working ? 'Distributing…' : 'Distribute anyway'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
