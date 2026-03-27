import type { UseFormRegisterReturn } from 'react-hook-form'

interface FieldToggleProps {
  label: string
  registration: UseFormRegisterReturn
  description?: string
}

export function FieldToggle({ label, registration, description }: FieldToggleProps) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <input
        {...registration}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#134848] focus:ring-[#134848]"
      />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
