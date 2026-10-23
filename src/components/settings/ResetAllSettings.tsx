import { useState } from 'react'

interface Props {
  onReset: () => void
}

const WORD = 'RESET'

/** Restoring factory settings loses the whole team's configuration, so it takes two separate confirmations. */
export function ResetAllSettings({ onReset }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [typed, setTyped] = useState('')

  const cancel = () => { setStep(0); setTyped('') }

  return (
    <section aria-label="Reset all settings" className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Reset all settings</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Restores every setting to its factory default for the whole team. Custom campaigns, signatures, lists, themes, modules, roles and Brand Guardian parameters will all be lost.
        </p>
      </div>

      {step === 0 && (
        <button type="button" onClick={() => setStep(1)} className="border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-medium">
          Reset all settings…
        </button>
      )}

      {step === 1 && (
        <div role="alert" className="space-y-2">
          <p className="text-xs font-medium text-red-600">Are you sure? This affects everyone on the team.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm font-medium">Yes, continue</button>
            <button type="button" onClick={cancel} className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <label htmlFor="reset-confirm" className="block text-xs font-medium text-gray-600 dark:text-gray-300">Type {WORD} to confirm</label>
          <input
            id="reset-confirm"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={typed !== WORD}
              onClick={() => { onReset(); cancel() }}
              className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset everything
            </button>
            <button type="button" onClick={cancel} className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}
