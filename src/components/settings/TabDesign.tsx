import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { DESIGN_ASSET_TYPES } from '../../lib/designConstants'
import { createDefaultDesignBriefingSettings } from '../../lib/settingsDefaults'
import type { DesignAssetTypeSettings, DesignBriefingSettings } from '../../types/settings.types'

export function TabDesign() {
  const { settings, updateSettings } = useSettings()

  // Ensure we always have a valid designBriefing config (could be missing on old saved settings)
  const designBriefing: DesignBriefingSettings =
    settings.designBriefing ?? createDefaultDesignBriefingSettings()

  const [expandedAssetType, setExpandedAssetType] = useState<string | null>(null)

  const update = (patch: Partial<DesignBriefingSettings>) => {
    updateSettings({ designBriefing: { ...designBriefing, ...patch } })
  }

  const updateAssetType = (id: string, patch: Partial<DesignAssetTypeSettings>) => {
    const assetTypes = designBriefing.assetTypes.map((at) =>
      at.id === id ? { ...at, ...patch } : at
    )
    update({ assetTypes })
  }

  const toggleFieldVisible = (assetTypeId: string, fieldId: string) => {
    const at = designBriefing.assetTypes.find((a) => a.id === assetTypeId)
    if (!at) return
    const fields = at.fields.map((f) =>
      f.id === fieldId ? { ...f, visible: !f.visible } : f
    )
    updateAssetType(assetTypeId, { fields })
  }

  const moveField = (assetTypeId: string, fieldId: string, direction: 'up' | 'down') => {
    const at = designBriefing.assetTypes.find((a) => a.id === assetTypeId)
    if (!at) return
    const sorted = [...at.fields].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((f) => f.id === fieldId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const updated = sorted.map((f, i) => {
      if (i === idx) return { ...f, order: sorted[swapIdx].order }
      if (i === swapIdx) return { ...f, order: sorted[idx].order }
      return f
    })
    updateAssetType(assetTypeId, { fields: updated })
  }

  const INPUT_CLASS = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40'
  const LABEL_CLASS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase mb-1.5'

  return (
    <div className="space-y-8">
      {/* ── General Settings ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">General Settings</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Configure defaults and master settings for the Design Briefing Platform.</p>

        <div className="space-y-5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Enable Design Briefing</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Show the Design Briefing Platform in the platform switcher</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={designBriefing.enabled}
              onClick={() => update({ enabled: !designBriefing.enabled })}
              className={`
                relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
                ${designBriefing.enabled ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              aria-label="Enable Design Briefing"
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${designBriefing.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Default requester name */}
          <div>
            <label htmlFor="design-default-name" className={LABEL_CLASS}>Default Requester Name</label>
            <input
              id="design-default-name"
              type="text"
              value={designBriefing.defaultRequesterName}
              onChange={(e) => update({ defaultRequesterName: e.target.value })}
              placeholder="e.g. Marketing Team"
              className={INPUT_CLASS}
            />
          </div>

          {/* Default requester email */}
          <div>
            <label htmlFor="design-default-email" className={LABEL_CLASS}>Default Requester Email</label>
            <input
              id="design-default-email"
              type="email"
              value={designBriefing.defaultRequesterEmail}
              onChange={(e) => update({ defaultRequesterEmail: e.target.value })}
              placeholder="e.g. marketing@ninetyone.com"
              className={INPUT_CLASS}
            />
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Allow mockups */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Allow Mockups</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Show the mockup viewer in the brief form</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={designBriefing.allowMockups}
              onClick={() => update({ allowMockups: !designBriefing.allowMockups })}
              className={`
                relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors
                focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
                ${designBriefing.allowMockups ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              aria-label="Allow mockups"
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${designBriefing.allowMockups ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Max attachments */}
          <div>
            <label htmlFor="design-max-attachments" className={LABEL_CLASS}>Max Attachments per Brief</label>
            <input
              id="design-max-attachments"
              type="number"
              min={1}
              max={20}
              value={designBriefing.maxAttachments}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 1 && v <= 20) update({ maxAttachments: v })
              }}
              className={`${INPUT_CLASS} w-28`}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Between 1 and 20</p>
          </div>
        </div>
      </section>

      {/* ── Asset Types ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Asset Types</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Enable or disable asset types and configure field order and visibility for each.
        </p>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {designBriefing.assetTypes.map((atSettings) => {
            const assetTypeDef = DESIGN_ASSET_TYPES.find((t) => t.id === atSettings.id)
            if (!assetTypeDef) return null

            const isExpanded = expandedAssetType === atSettings.id
            const sortedFields = [...atSettings.fields].sort((a, b) => a.order - b.order)

            return (
              <div key={atSettings.id} className="bg-white dark:bg-gray-900">
                {/* Asset type row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={atSettings.enabled}
                    onClick={() => updateAssetType(atSettings.id, { enabled: !atSettings.enabled })}
                    className={`
                      relative inline-flex h-4 w-8 shrink-0 rounded-full border-2 border-transparent transition-colors
                      focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
                      ${atSettings.enabled ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                    aria-label={`${atSettings.enabled ? 'Disable' : 'Enable'} ${assetTypeDef.label}`}
                  >
                    <span className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform ${atSettings.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>

                  {/* Emoji + label */}
                  <span className="text-base" aria-hidden="true">{assetTypeDef.emoji}</span>
                  <p className={`flex-1 text-sm font-medium ${atSettings.enabled ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                    {assetTypeDef.label}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-600">
                    {atSettings.fields.filter((f) => f.visible).length}/{atSettings.fields.length} fields visible
                  </span>

                  {/* Expand chevron */}
                  {assetTypeDef.fields.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedAssetType(isExpanded ? null : atSettings.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${assetTypeDef.label} fields`}
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Expanded field list */}
                {isExpanded && assetTypeDef.fields.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-[0.1em]">
                      Field Order & Visibility
                    </p>
                    <div className="space-y-2">
                      {sortedFields.map((fieldSettings, idx) => {
                        const fieldDef = assetTypeDef.fields.find((f) => f.id === fieldSettings.id)
                        if (!fieldDef) return null

                        return (
                          <div
                            key={fieldSettings.id}
                            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2"
                          >
                            {/* Drag handle / reorder buttons */}
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveField(atSettings.id, fieldSettings.id, 'up')}
                                disabled={idx === 0}
                                aria-label={`Move ${fieldDef.label} up`}
                                className="w-5 h-4 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                  <polyline points="18 15 12 9 6 15" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveField(atSettings.id, fieldSettings.id, 'down')}
                                disabled={idx === sortedFields.length - 1}
                                aria-label={`Move ${fieldDef.label} down`}
                                className="w-5 h-4 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </div>

                            {/* Field label */}
                            <span className={`flex-1 text-xs font-medium ${fieldSettings.visible ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                              {fieldDef.label}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono mr-1">{fieldDef.type}</span>

                            {/* Visibility toggle */}
                            <button
                              type="button"
                              role="switch"
                              aria-checked={fieldSettings.visible}
                              onClick={() => toggleFieldVisible(atSettings.id, fieldSettings.id)}
                              className={`
                                relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors
                                focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
                                ${fieldSettings.visible ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-200 dark:bg-gray-700'}
                              `}
                              aria-label={`${fieldSettings.visible ? 'Hide' : 'Show'} ${fieldDef.label} field`}
                            >
                              <span className={`pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform ${fieldSettings.visible ? 'translate-x-3' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
