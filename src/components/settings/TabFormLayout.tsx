import { useSettings } from '../../contexts/SettingsContext'
import { BRIEF_SECTIONS, type BriefSectionId } from '../../lib/briefSections'
import { moveSection, resolveFieldOrder, resolveHidden, resolveSectionOrder } from '../../lib/briefLayout'
import { REQUIRABLE_FIELDS, resolveRequired } from '../../lib/briefRequirements'

// What a section holds when none of its fields can be switched here.
const NO_FIELDS: Partial<Record<BriefSectionId, string>> = {
  audience: 'Distribution lists and the Pardot list come from the chosen campaign, so there is nothing to switch here.',
  materials: 'Attachments and links are always optional.',
  tags: 'Tags are generated from the brief, so there is nothing to fill in.',
}

export function TabFormLayout() {
  const { settings, updateSettings } = useSettings()

  const layout = settings.briefLayout ?? { sectionOrder: [], requiredFields: {} }
  const order = resolveSectionOrder(layout.sectionOrder)
  const required = resolveRequired(layout.requiredFields)
  const hidden = resolveHidden(layout.hiddenFields)
  const customised = layout.sectionOrder.length > 0 || Object.keys(layout.requiredFields).length > 0
    || Object.keys(layout.fieldOrder ?? {}).length > 0 || (layout.hiddenFields ?? []).length > 0

  const move = (id: BriefSectionId, direction: -1 | 1) => {
    updateSettings({ briefLayout: { ...layout, sectionOrder: moveSection(order, id, direction) } })
  }

  const setRequired = (path: string, value: boolean) => {
    updateSettings({ briefLayout: { ...layout, requiredFields: { ...layout.requiredFields, [path]: value } } })
  }

  const moveField = (section: BriefSectionId, path: string, direction: -1 | 1) => {
    const order = resolveFieldOrder(section, layout.fieldOrder)
    updateSettings({ briefLayout: { ...layout, fieldOrder: { ...layout.fieldOrder, [section]: moveSection(order, path, direction) } } })
  }

  const setShown = (path: string, shown: boolean) => {
    const rest = (layout.hiddenFields ?? []).filter((p) => p !== path)
    updateSettings({ briefLayout: { ...layout, hiddenFields: shown ? rest : [...rest, path] } })
  }

  const reset = () => updateSettings({ briefLayout: { sectionOrder: [], requiredFields: {}, fieldOrder: {}, hiddenFields: [] } })

  // The parts of the Review and Submission step that can be switched off.
  const reviewFields = settings.formFields.filter((f) => f.id.startsWith('review.')).sort((a, b) => a.order - b.order)
  const toggleVisible = (fieldId: string) => {
    updateSettings({ formFields: settings.formFields.map((f) => (f.id === fieldId ? { ...f, visible: !f.visible } : f)) })
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Brief sections</h3>
          {customised && (
            <button type="button" onClick={reset} className="shrink-0 text-xs text-brand-primary dark:text-brand-accent underline underline-offset-2 hover:no-underline">
              Reset to defaults
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          These are the sections of the brief on Brief &amp; Build, in the order requesters fill them in. Move a section, or a field within it, up or down to change
          where it sits. Switch a field off to take it off the form (it is then never asked for), or set whether it has to be filled in before a brief can go to review. The email builder always follows the brief.
        </p>

        <ol className="space-y-3">
          {order.map((id, index) => {
            const label = BRIEF_SECTIONS[id].label
            const defs = REQUIRABLE_FIELDS[id] ?? []
            const fields = resolveFieldOrder(id, layout.fieldOrder).map((path) => defs.find((d) => d.path === path)!)
            return (
              <li key={id} className="border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-t-md">
                  <span className="w-6 h-6 rounded-full bg-brand-primary dark:bg-brand-accent text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => move(id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${label} up`}
                      className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(id, 1)}
                      disabled={index === order.length - 1}
                      aria-label={`Move ${label} down`}
                      className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>

                {fields.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">{NO_FIELDS[id]}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {fields.map((field, fieldIndex) => {
                      const on = required[field.path]
                      const off = hidden.has(field.path)
                      return (
                        <li key={field.path} className="flex items-center gap-3 px-3 py-2">
                          <div className="flex flex-col shrink-0">
                            <button
                              type="button"
                              onClick={() => moveField(id, field.path, -1)}
                              disabled={fieldIndex === 0}
                              aria-label={`Move ${field.label} up`}
                              className="p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M18 15l-6-6-6 6" /></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => moveField(id, field.path, 1)}
                              disabled={fieldIndex === fields.length - 1}
                              aria-label={`Move ${field.label} down`}
                              className="p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                          </div>
                          <div className={`flex-1 min-w-0 ${off ? 'opacity-60' : ''}`}>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{field.label}</p>
                            <p className="text-xs font-mono text-gray-400">{off ? 'Off: not on the form, never asked for' : field.path}</p>
                          </div>
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={`${field.label}: required`}
                            onClick={() => setRequired(field.path, !on)}
                            title={off ? 'Switched off, so it is never asked for. This applies if you switch it back on' : on ? 'Click to make optional' : 'Click to make required'}
                            className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors shrink-0 ${off ? 'opacity-40' : ''} ${
                              on && !off
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {on ? 'Required' : 'Optional'}
                          </button>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!off}
                            aria-label={`Show ${field.label}`}
                            onClick={() => setShown(field.path, off)}
                            title={off ? 'Show this field on the brief' : 'Switch this field off'}
                            className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${off ? 'bg-gray-300 dark:bg-gray-600' : 'bg-brand-primary dark:bg-brand-accent'}`}
                          >
                            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${off ? 'left-0.5' : 'left-[17px]'}`} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {reviewFields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Review and Submission</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Choose which parts of the brief summary and export options are shown on the review step.</p>
          <div className="space-y-0.5">
            {reviewFields.map((field) => (
              <div key={field.id} className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!field.visible ? 'opacity-60' : ''}`}>
                <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{field.label}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.visible}
                  aria-label={`Show ${field.label}`}
                  onClick={() => toggleVisible(field.id)}
                  className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${field.visible ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${field.visible ? 'left-[17px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
