import type { UseFormRegisterReturn, FieldError } from 'react-hook-form'

interface Option {
  value: string
  label: string
}

interface FieldSelectProps {
  label: string
  registration: UseFormRegisterReturn
  options: Option[]
  error?: FieldError
  required?: boolean
  placeholder?: string
}

export function FieldSelect({
  label,
  registration,
  options,
  error,
  required,
  placeholder,
}: FieldSelectProps) {
  const selectId = registration.name.replace(/\./g, '-')
  return (
    <div className="mb-4">
      <label htmlFor={selectId} className="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        {...registration}
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors ${
          error ? 'border-red-400' : 'border-brand-border-field dark:border-gray-600'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={`${selectId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">{error.message}</p>}
    </div>
  )
}
