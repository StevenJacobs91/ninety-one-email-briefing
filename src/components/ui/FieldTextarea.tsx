import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface FieldTextareaProps {
  label: string
  registration: UseFormRegisterReturn
  error?: FieldError
  required?: boolean
  placeholder?: string
  maxLength?: number
  currentLength?: number
  rows?: number
}

export function FieldTextarea({
  label,
  registration,
  error,
  required,
  placeholder,
  maxLength,
  currentLength,
  rows = 3,
}: FieldTextareaProps) {
  const textareaId = registration.name.replace(/\./g, '-')
  return (
    <div className="mb-4">
      <label htmlFor={textareaId} className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <textarea
        {...registration}
        id={textareaId}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors ${
          error ? 'border-red-400' : 'border-brand-border-field dark:border-gray-600'
        }`}
      />
      <div className="flex justify-between mt-1">
        {error && <p id={`${textareaId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
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
