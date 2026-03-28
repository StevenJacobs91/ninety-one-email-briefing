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
      <label htmlFor={selectId} className="block text-[11px] tracking-[0.12em] uppercase font-ni-heading text-[#6b6660] dark:text-gray-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        {...registration}
        id={selectId}
        className={`w-full border px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#134848] dark:focus:border-[#fbaa96] transition-colors ${
          error ? 'border-red-400' : 'border-[#d4cfc6] dark:border-gray-600'
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
