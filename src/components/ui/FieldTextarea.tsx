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
      <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        {...registration}
        id={textareaId}
        placeholder={placeholder}
        rows={rows}
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
