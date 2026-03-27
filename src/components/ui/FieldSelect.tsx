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
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        {...registration}
        id={selectId}
        className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] ${
          error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
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
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error.message}</p>}
    </div>
  )
}
