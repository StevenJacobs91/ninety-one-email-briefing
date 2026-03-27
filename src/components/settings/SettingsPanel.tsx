import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import type { SettingsTab } from '../../types/settings.types'
import { TabGeneral } from './TabGeneral'
import { TabThemes } from './TabThemes'
import { TabTemplates } from './TabTemplates'
import { TabModules } from './TabModules'
import { TabFormLayout } from './TabFormLayout'
import { TabBrandGuardian } from './TabBrandGuardian'
import { TabDisclaimers } from './TabDisclaimers'
import { TabPardot } from './TabPardot'

const TABS: { id: SettingsTab; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Sender defaults, form defaults, and n8n integration' },
  { id: 'themes', label: 'Brand Themes', description: 'Manage colour palettes and brand themes' },
  { id: 'templates', label: 'HTML Templates', description: 'Configure template file mappings' },
  { id: 'modules', label: 'Email Modules', description: 'Add, remove, and organise email modules' },
  { id: 'layout', label: 'Form Layout', description: 'Reorder fields and set required/optional' },
  { id: 'guardian', label: 'Brand Guardian', description: 'Tune review thresholds and checks' },
  { id: 'disclaimers', label: 'Disclaimers', description: 'Configure legal disclaimer text per region' },
  { id: 'pardot', label: 'Pardot API', description: 'Configure Salesforce Account Engagement integration' },
]

export function SettingsPanel() {
  const { isOpen, closeSettings, resetSettings } = useSettings()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Trap focus and handle escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, closeSettings])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure the email briefing form, themes, modules, and brand review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 transition-colors"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={closeSettings}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Close settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 px-6 shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.id
                  ? 'border-[#134848] dark:border-[#fbaa96] text-[#134848] dark:text-[#fbaa96]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {TABS.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'general' && <TabGeneral />}
          {activeTab === 'themes' && <TabThemes />}
          {activeTab === 'templates' && <TabTemplates />}
          {activeTab === 'modules' && <TabModules />}
          {activeTab === 'layout' && <TabFormLayout />}
          {activeTab === 'guardian' && <TabBrandGuardian />}
          {activeTab === 'disclaimers' && <TabDisclaimers />}
          {activeTab === 'pardot' && <TabPardot />}
        </div>

        {/* Reset confirmation modal */}
        {showResetConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reset All Settings?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                This will restore all settings to their factory defaults. Custom themes, modules, field configurations, and Brand Guardian parameters will be lost.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetSettings()
                    setShowResetConfirm(false)
                  }}
                  className="flex-1 bg-red-600 text-white py-2 px-3 rounded-md text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  Reset Everything
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 px-3 rounded-md text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
