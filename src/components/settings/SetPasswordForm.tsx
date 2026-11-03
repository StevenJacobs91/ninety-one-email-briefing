import { useState } from 'react'

/** The shortest password the form accepts; the login service may ask for more and says so. */
export const MIN_PASSWORD_LENGTH = 6

interface Props {
  name: string
  email: string
  /** Sets the password; rejects with the reason it could not be set */
  onSubmit: (password: string) => Promise<void>
  onCancel: () => void
}

/** Sets a new password for one team member. Shown under their row by an admin. */
export function SetPasswordForm({ name, email, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const id = `set-password-${email}`

  async function submit() {
    if (saving) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setError('')
    setDone(false)
    setSaving(true)
    try {
      await onSubmit(password)
      setPassword('')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The password could not be set.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-4 mb-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New password for {name}</label>
        <div className="relative max-w-sm">
          <input
            id={id}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setDone(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
            placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-14 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {email} signs in with this from now on. Tell them what it is; it is not emailed to them.
        </p>
      </div>

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {done && <p role="status" className="text-xs text-green-700 dark:text-green-400">Password updated for {name}.</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="px-3 py-1.5 rounded-md bg-brand-primary text-white text-xs font-medium hover:bg-brand-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Setting…' : 'Set password'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          {done ? 'Close' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
