import { useMemo } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface FieldToggleProps {
  label: string
  registration: UseFormRegisterReturn
  description?: string
}

export function FieldToggle({ label, registration, description }: FieldToggleProps) {
  const id = useMemo(() => `toggle-${registration.name}`, [registration.name])

  return (
    <div className="mb-4 flex items-start gap-3">
      <input
        {...registration}
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{label}</label>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
