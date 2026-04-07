import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import type { SettingsTab } from '../../types/settings.types'
import { TabGeneral } from './TabGeneral'
import { TabThemes } from './TabThemes'
import { TabTemplates } from './TabTemplates'
import { TabAssets } from './TabAssets'
import { TabModules } from './TabModules'
import { TabFormLayout } from './TabFormLayout'
import { TabBrandGuardian } from './TabBrandGuardian'
import { TabDisclaimers } from './TabDisclaimers'
import { TabPardot } from './TabPardot'
import { TabCampaigns } from './TabCampaigns'
import { TabLists } from './TabLists'
import { TabSignatures } from './TabSignatures'
import { TabUsers } from './TabUsers'
import { TabAuditLog } from './TabAuditLog'
import { TabCampaignInsights } from './TabCampaignInsights'
import { TabApprovals } from './TabApprovals'
import { TabSendTimeOptimisation } from './TabSendTimeOptimisation'
import { TabBenchmarks } from './TabBenchmarks'
import { TabAudienceHealth } from './TabAudienceHealth'

interface TabConfig {
  id: SettingsTab
  label: string
  description: string
}

interface NavGroup {
  label: string
  tabs: TabConfig[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Setup',
    tabs: [
      { id: 'general',    label: 'General',    description: 'Sender defaults, form defaults, and n8n integration' },
      { id: 'campaigns',  label: 'Campaigns',  description: 'Manage campaigns, audience filters, and sender presets' },
      { id: 'lists',      label: 'Lists',      description: 'Add custom client groups, regions, channels, and email types' },
      { id: 'signatures', label: 'Signatures', description: 'Manage footer sign-off signatures for the Content step' },
      { id: 'users',      label: 'Users',      description: 'Manage team members, roles, and access' },
      { id: 'audit',      label: 'Audit Trail', description: 'Track user activity and manage audit logging' },
    ],
  },
  {
    label: 'Design',
    tabs: [
      { id: 'themes',    label: 'Brand Themes',  description: 'Manage colour palettes and brand themes' },
      { id: 'templates', label: 'HTML Templates', description: 'Configure template file mappings' },
      { id: 'assets',    label: 'Asset Library',  description: 'Manage reusable headers, profiles, stripes, logos, and graphics' },
      { id: 'layout',    label: 'Form Layout',    description: 'Reorder fields and set required/optional' },
    ],
  },
  {
    label: 'Content',
    tabs: [
      { id: 'modules', label: 'Email Modules', description: 'Add, remove, and organise email modules' },
    ],
  },
  {
    label: 'Compliance',
    tabs: [
      { id: 'guardian',    label: 'Brand Guardian', description: 'Tune review thresholds and checks' },
      { id: 'disclaimers', label: 'Disclaimers',    description: 'Configure legal disclaimer text per region' },
      { id: 'pardot',      label: 'Pardot API',     description: 'Configure Salesforce Account Engagement integration' },
    ],
  },
  {
    label: 'Analytics',
    tabs: [
      { id: 'insights',        label: 'Campaign Insights',     description: 'Enable or disable insights and configure which panels are shown' },
      { id: 'send-time',       label: 'Send Time Optimisation', description: 'ML-powered send time recommendations based on historical engagement' },
      { id: 'benchmarks',      label: 'Benchmarks',            description: 'Add industry benchmark data and compare against your campaign performance' },
      { id: 'audience-health', label: 'Audience Health',       description: 'Configure predictive churn detection and audience health monitoring' },
    ],
  },
  {
    label: 'Approvals',
    tabs: [
      { id: 'approvals', label: 'Approvals', description: 'Configure approval workflow, roles, and routing rules' },
    ],
  },
]

const ALL_TABS: TabConfig[] = NAV_GROUPS.flatMap((g) => g.tabs)

export function SettingsPanel() {
  const { isOpen, closeSettings, resetSettings } = useSettings()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const canAccessSettings = profile?.role === 'admin' || profile?.role === 'producer'

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, closeSettings])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  if (!canAccessSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeSettings} />
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-lg font-ni-display text-gray-900 dark:text-gray-100 mb-2">Access Restricted</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Settings are available to Admins and Producers only. Contact your team admin to request access.
          </p>
          <button
            type="button"
            onClick={closeSettings}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const activeTabConfig = ALL_TABS.find((t) => t.id === activeTab)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-ni-display text-gray-900 dark:text-gray-100">Settings</h2>
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

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-4 bg-gray-50/60 dark:bg-gray-900/60">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {group.label}
                </p>
                {group.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-brand-primary dark:text-brand-accent bg-brand-primary/8 dark:bg-brand-primary/20 border-r-2 border-brand-primary dark:border-brand-accent'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Content area */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            {/* Tab description */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{activeTabConfig?.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activeTabConfig?.description}</p>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === 'general'    && <TabGeneral />}
              {activeTab === 'campaigns'  && <TabCampaigns />}
              {activeTab === 'lists'      && <TabLists />}
              {activeTab === 'signatures' && <TabSignatures />}
              {activeTab === 'users'      && <TabUsers />}
              {activeTab === 'audit'      && <TabAuditLog />}
              {activeTab === 'themes'     && <TabThemes />}
              {activeTab === 'templates'  && <TabTemplates />}
              {activeTab === 'assets'     && <TabAssets />}
              {activeTab === 'modules'    && <TabModules />}
              {activeTab === 'layout'     && <TabFormLayout />}
              {activeTab === 'guardian'   && <TabBrandGuardian />}
              {activeTab === 'disclaimers' && <TabDisclaimers />}
              {activeTab === 'pardot'     && <TabPardot />}
              {activeTab === 'insights'   && <TabCampaignInsights />}
              {activeTab === 'approvals'       && <TabApprovals />}
              {activeTab === 'send-time'       && <TabSendTimeOptimisation />}
              {activeTab === 'benchmarks'      && <TabBenchmarks />}
              {activeTab === 'audience-health' && <TabAudienceHealth />}
            </div>
          </div>
        </div>

        {/* Reset confirmation modal */}
        {showResetConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reset All Settings?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                This will restore all settings to their factory defaults. Custom campaigns, signatures, lists, themes, modules, and Brand Guardian parameters will all be lost.
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
