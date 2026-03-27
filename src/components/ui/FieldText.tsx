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
}: FieldTextProps) {
  const inputId = registration.name.replace(/\./g, '-')
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...registration}
        id={inputId}
        type={type}
        placeholder={placeholder}
        min={min}
        className={`w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] ${
          error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
        }`}
      />
      <div className="flex justify-between mt-1">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
        {maxLength != null && currentLength != null && (
          <p className={`text-xs ml-auto ${
            currentLength > maxLength
              ? 'text-red-600 dark:text-red-400'
              : currentLength > maxLength * 0.8
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
          }`}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
