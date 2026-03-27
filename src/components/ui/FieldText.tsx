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
}: FieldTextProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...registration}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] ${
          error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
        }`}
      />
      <div className="flex justify-between mt-1">
        {error && <p className="text-xs text-red-600">{error.message}</p>}
        {maxLength != null && currentLength != null && (
          <p className={`text-xs ml-auto ${currentLength > maxLength ? 'text-red-600' : 'text-gray-400'}`}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
