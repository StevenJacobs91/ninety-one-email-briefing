import { useState, useMemo } from 'react'
import { useSettings } from '../../contexts/SettingsContext'

export function TabFormLayout() {
  const { settings, updateSettings } = useSettings()
  const [activeStep, setActiveStep] = useState(0)

  const steps = settings.formSteps
  const fields = settings.formFields

  // Fields for the currently selected step, sorted by order
  const stepFields = useMemo(
    () => fields.filter((f) => f.stepIndex === activeStep).sort((a, b) => a.order - b.order),
    [fields, activeStep]
  )

  const moveField = (fieldId: string, direction: -1 | 1) => {
    const sorted = [...stepFields].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((f) => f.id === fieldId)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sorted.length) return

    // Swap orders
    const updatedFields = fields.map((f) => {
      if (f.id === sorted[index].id) return { ...f, order: sorted[newIndex].order }
      if (f.id === sorted[newIndex].id) return { ...f, order: sorted[index].order }
      return f
    })
    updateSettings({ formFields: updatedFields })
  }

  const toggleRequired = (fieldId: string) => {
    updateSettings({
      formFields: fields.map((f) =>
        f.id === fieldId ? { ...f, required: !f.required } : f
      ),
    })
  }

  const toggleVisible = (fieldId: string) => {
    updateSettings({
      formFields: fields.map((f) =>
        f.id === fieldId ? { ...f, visible: !f.visible } : f
      ),
    })
  }

  const moveStep = (stepIndex: number, direction: -1 | 1) => {
    const sorted = [...steps].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((s) => s.order === stepIndex)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sorted.length) return

    const updatedSteps = steps.map((s) => {
      if (s.order === sorted[index].order) return { ...s, order: sorted[newIndex].order }
      if (s.order === sorted[newIndex].order) return { ...s, order: sorted[index].order }
      return s
    })

    // Also remap field stepIndex values
    const oldStepOrder = sorted[index].order
    const newStepOrder = sorted[newIndex].order
    const updatedFields = fields.map((f) => {
      if (f.stepIndex === oldStepOrder) return { ...f, stepIndex: newStepOrder }
      if (f.stepIndex === newStepOrder) return { ...f, stepIndex: oldStepOrder }
      return f
    })

    updateSettings({ formSteps: updatedSteps, formFields: updatedFields })
  }

  const toggleStepVisible = (stepOrder: number) => {
    updateSettings({
      formSteps: steps.map((s) =>
        s.order === stepOrder ? { ...s, visible: !s.visible } : s
      ),
    })
  }

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps])

  return (
    <div>
      {/* Step reordering */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Form Steps</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Reorder the main form steps and toggle their visibility. The Brand Review and HTML Email steps are always shown after these.
        </p>
        <div className="space-y-1">
          {sortedSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                activeStep === step.order
                  ? 'bg-brand-primary/10 dark:bg-brand-accent/10 ring-1 ring-brand-primary/30 dark:ring-brand-accent/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              } ${!step.visible ? 'opacity-50' : ''}`}
            >
              {/* Reorder controls */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => moveStep(step.order, -1)} disabled={index === 0} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button type="button" onClick={() => moveStep(step.order, 1)} disabled={index === sortedSteps.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>

              {/* Step number */}
              <span className="w-6 h-6 rounded-full bg-brand-primary dark:bg-brand-accent text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>

              {/* Step name — clickable to show fields */}
              <button
                type="button"
                onClick={() => setActiveStep(step.order)}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.label}</p>
                <p className="text-xs text-gray-400">
                  {fields.filter((f) => f.stepIndex === step.order && f.visible).length} fields visible
                </p>
              </button>

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={() => toggleStepVisible(step.order)}
                className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${
                  step.visible ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={step.visible ? 'Hide step' : 'Show step'}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  step.visible ? 'left-[17px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Field configuration for selected step */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Fields — {sortedSteps.find((s) => s.order === activeStep)?.label ?? 'Step'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Reorder fields within this step, toggle visibility, and set required/optional status.
        </p>

        <div className="space-y-0.5">
          {stepFields.map((field, index) => (
            <div
              key={field.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!field.visible ? 'opacity-50' : ''}`}
            >
              {/* Reorder controls */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" onClick={() => moveField(field.id, -1)} disabled={index === 0} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button type="button" onClick={() => moveField(field.id, 1)} disabled={index === stepFields.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>

              {/* Field label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{field.label}</p>
                <p className="text-xs font-mono text-gray-400">{field.id}</p>
              </div>

              {/* Required badge */}
              <button
                type="button"
                onClick={() => toggleRequired(field.id)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors shrink-0 ${
                  field.required
                    ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={field.required ? 'Click to make optional' : 'Click to make required'}
              >
                {field.required ? 'Required' : 'Optional'}
              </button>

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={() => toggleVisible(field.id)}
                className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${
                  field.visible ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={field.visible ? 'Hide field' : 'Show field'}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  field.visible ? 'left-[17px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>

        {stepFields.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No fields in this step.</p>
        )}
      </div>
    </div>
  )
}
