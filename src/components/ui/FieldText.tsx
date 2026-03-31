import { useState, useCallback } from 'react'
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FieldTextProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  required?: boolean
  placeholder?: string
  maxLength?: number
  currentLength?: number
  type?: 'text' | 'email' | 'number' | 'date'
  min?: string
  validateUrl?: boolean
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function FieldText({
  label,
  registration,
  error,
  required,
  placeholder,
  maxLength,
  currentLength,
  type = 'text',
  min,
  validateUrl = false,
}: FieldTextProps) {
  const inputId = registration.name.replace(/\./g, '-')
  const [urlValid, setUrlValid] = useState<boolean | null>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    registration.onChange(e)
    if (validateUrl) {
      const val = e.target.value.trim()
      setUrlValid(val === '' ? null : isValidUrl(val))
    }
  }, [registration, validateUrl])

  const showUrlFeedback = validateUrl && urlValid !== null

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <div className="relative">
        <input
          {...registration}
          onChange={handleChange}
          id={inputId}
          type={type}
          placeholder={placeholder}
          min={min}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors ${
            showUrlFeedback ? 'pr-8' : ''
          } ${
            error ? 'border-red-400' : 'border-brand-border-field dark:border-gray-600'
          }`}
        />
        {showUrlFeedback && (
          <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold ${
            urlValid ? 'text-green-600' : 'text-red-500'
          }`} aria-hidden="true">
            {urlValid ? '✓' : '✕'}
          </span>
        )}
      </div>
      <div className="flex justify-between mt-1">
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message}</p>
        ) : showUrlFeedback && !urlValid ? (
          <p className="text-xs text-red-500 dark:text-red-400">Must be a valid URL starting with https://</p>
        ) : null}
        {maxLength != null && currentLength != null && (
          <p className={`text-xs ml-auto ${
            currentLength > maxLength
              ? 'text-red-600 dark:text-red-400'
              : currentLength > maxLength * 0.8
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
          }`} aria-live="polite">
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
