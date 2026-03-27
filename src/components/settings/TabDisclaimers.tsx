import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { LegalDisclaimerConfig } from '../../types/settings.types'
import { REGIONS } from '../../lib/constants'
import { v4 as uuidv4 } from 'uuid'

export function TabDisclaimers() {
  const { settings, updateSettings } = useSettings()
  const disclaimers = settings.legalDisclaimers ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function updateDisclaimer(id: string, patch: Partial<LegalDisclaimerConfig>) {
    updateSettings({
      legalDisclaimers: disclaimers.map((d) => d.id === id ? { ...d, ...patch } : d),
    })
  }

  function setDefault(id: string, region: string) {
    // Only one disclaimer can be the default per region
    updateSettings({
      legalDisclaimers: disclaimers.map((d) => ({
        ...d,
        isDefault: d.id === id ? true : d.region === region ? false : d.isDefault,
      })),
    })
  }

  function addDisclaimer() {
    const newD: LegalDisclaimerConfig = {
      id: uuidv4(),
      label: 'New Disclaimer',
      region: 'GLOBAL',
      text: '',
      isDefault: false,
    }
    updateSettings({ legalDisclaimers: [...disclaimers, newD] })
    setExpandedId(newD.id)
  }

  function removeDisclaimer(id: string) {
    updateSettings({ legalDisclaimers: disclaimers.filter((d) => d.id !== id) })
    if (expandedId === id) setExpandedId(null)
  }

  const allRegions: string[] = [...REGIONS, 'GLOBAL']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Legal Disclaimers</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure disclaimer text per region. The default for each region is automatically applied in the brief.
          </p>
        </div>
        <button
          type="button"
          onClick={addDisclaimer}
          className="text-xs font-medium text-[#134848] dark:text-[#fbaa96] px-3 py-1.5 rounded border border-[#134848]/30 dark:border-[#fbaa96]/30 hover:bg-[#134848]/5 transition-colors"
        >
          + Add Disclaimer
        </button>
      </div>

      {disclaimers.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No disclaimers configured.</p>
      )}

      <div className="space-y-2">
        {disclaimers.map((d) => {
          const isExpanded = expandedId === d.id
          return (
            <div key={d.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : d.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.isDefault ? 'bg-[#134848] dark:bg-[#fbaa96]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{d.label}</p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{d.region}</span>
                  {d.isDefault && (
                    <span className="text-xs bg-[#134848]/10 dark:bg-[#fbaa96]/10 text-[#134848] dark:text-[#fbaa96] px-1.5 py-0.5 rounded shrink-0">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeDisclaimer(d.id) }}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm px-1"
                    title="Remove disclaimer"
                    aria-label="Remove disclaimer"
                  >
                    &times;
                  </button>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Edit form */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
                    <input
                      type="text"
                      value={d.label}
                      onChange={(e) => updateDisclaimer(d.id, { label: e.target.value })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848]"
                      placeholder="e.g. South Africa — FSP Standard"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Region</label>
                    <select
                      value={d.region}
                      onChange={(e) => updateDisclaimer(d.id, { region: e.target.value })}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848]"
                    >
                      {allRegions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Disclaimer Text</label>
                    <textarea
                      value={d.text}
                      onChange={(e) => updateDisclaimer(d.id, { text: e.target.value })}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848]/30 focus:border-[#134848] resize-y"
                      placeholder="Full disclaimer text..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`default-${d.id}`}
                      checked={d.isDefault}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDefault(d.id, d.region)
                        } else {
                          updateDisclaimer(d.id, { isDefault: false })
                        }
                      }}
                      className="rounded border-gray-300 text-[#134848]"
                    />
                    <label htmlFor={`default-${d.id}`} className="text-xs text-gray-600 dark:text-gray-400">
                      Set as default for {d.region}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
