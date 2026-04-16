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
import { TabGreetings } from './TabGreetings'
import { TabNotifications } from './TabNotifications'

interface TabConfig {
  id: SettingsTab
  label: string
  description: string
}

interface NavGroup {
  label: string
  tabs: TabConfig[]
}

const NAV_LAYOUT_KEY = 'ni-settings-nav-layout'

const NAV_GROUPS_DEFAULT: NavGroup[] = [
  {
    label: 'Content',
    tabs: [
      { id: 'campaigns',   label: 'Campaigns',    description: 'Manage campaigns, audience filters, and sender presets' },
      { id: 'lists',       label: 'Targeting',    description: 'Add custom client groups, regions, channels, and email types' },
      { id: 'greetings',   label: 'Greetings',    description: 'Manage email greeting options and salutation text' },
      { id: 'signatures',  label: 'Signatures',   description: 'Manage footer sign-off signatures for the Content step' },
      { id: 'disclaimers', label: 'Disclaimers',  description: 'Configure legal disclaimer text per region' },
      { id: 'assets',      label: 'Asset Library', description: 'Manage reusable headers, profiles, stripes, logos, and graphics' },
    ],
  },
  {
    label: 'Design Elements',
    tabs: [
      { id: 'themes',    label: 'Brand Themes',   description: 'Manage colour palettes and brand themes' },
      { id: 'templates', label: 'HTML Templates', description: 'Configure template file mappings' },
      { id: 'modules',   label: 'Email Modules',  description: 'Add, remove, and organise email modules' },
      { id: 'guardian',  label: 'Brand Guardian', description: 'Tune review thresholds and checks' },
    ],
  },
  {
    label: 'Analytics',
    tabs: [
      { id: 'insights',        label: 'Campaign Insights',      description: 'Enable or disable insights and configure which panels are shown' },
      { id: 'send-time',       label: 'Send Time Optimisation', description: 'ML-powered send time recommendations based on historical engagement' },
      { id: 'benchmarks',      label: 'Benchmarks',             description: 'Add industry benchmark data and compare against your campaign performance' },
      { id: 'audience-health', label: 'Audience Health',        description: 'Configure predictive churn detection and audience health monitoring' },
    ],
  },
  {
    label: 'Setup',
    tabs: [
      { id: 'general',   label: 'General',     description: 'Sender defaults, form defaults, and n8n integration' },
      { id: 'layout',    label: 'Form Layout',  description: 'Reorder fields and set required/optional' },
      { id: 'users',     label: 'Users',        description: 'Manage team members, roles, and access' },
      { id: 'approvals',      label: 'Approvals',      description: 'Configure approval workflow, roles, and routing rules' },
      { id: 'audit',          label: 'Audit Trail',    description: 'Track user activity and manage audit logging' },
      { id: 'notifications',  label: 'Notifications',  description: 'Configure Power Automate webhook triggers for email notifications' },
      { id: 'pardot',         label: 'Pardot API',     description: 'Configure Salesforce Account Engagement integration' },
    ],
  },
]

function loadNavGroups(): NavGroup[] {
  try {
    const saved = localStorage.getItem(NAV_LAYOUT_KEY)
    if (!saved) return NAV_GROUPS_DEFAULT
    const parsed: NavGroup[] = JSON.parse(saved)
    // If any default tab IDs are missing from the saved layout, reset to defaults
    const defaultIds = new Set(NAV_GROUPS_DEFAULT.flatMap((g) => g.tabs.map((t) => t.id)))
    const savedIds = new Set(parsed.flatMap((g) => g.tabs.map((t) => t.id as string)))
    for (const id of defaultIds) {
      if (!savedIds.has(id)) return NAV_GROUPS_DEFAULT
    }
    return parsed
  } catch {
    return NAV_GROUPS_DEFAULT
  }
}

export function SettingsPanel() {
  const { isOpen, closeSettings, resetSettings } = useSettings()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [navGroups, setNavGroups] = useState<NavGroup[]>(loadNavGroups)
  const [editSnapshot, setEditSnapshot] = useState<NavGroup[] | null>(null)
  const [dragItem, setDragItem] = useState<{ groupIdx: number; tabIdx: number } | null>(null)
  const [dropPos, setDropPos] = useState<{ groupIdx: number; tabIdx: number } | null>(null)

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
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  function handleStartEdit() {
    setEditSnapshot(navGroups.map((g) => ({ ...g, tabs: [...g.tabs] })))
    setIsEditMode(true)
  }

  function handleSaveLayout() {
    localStorage.setItem(NAV_LAYOUT_KEY, JSON.stringify(navGroups))
    setIsEditMode(false)
    setEditSnapshot(null)
    setDragItem(null)
    setDropPos(null)
  }

  function handleCancelEdit() {
    if (editSnapshot) setNavGroups(editSnapshot)
    setIsEditMode(false)
    setEditSnapshot(null)
    setDragItem(null)
    setDropPos(null)
  }

  function handleDrop() {
    if (!dragItem || !dropPos) {
      setDragItem(null)
      setDropPos(null)
      return
    }
    const { groupIdx: fromG, tabIdx: fromT } = dragItem
    const { groupIdx: toG, tabIdx: toT } = dropPos

    // No-op if dropping onto itself
    if (fromG === toG && (fromT === toT || fromT + 1 === toT)) {
      setDragItem(null)
      setDropPos(null)
      return
    }

    const groups = navGroups.map((g) => ({ ...g, tabs: [...g.tabs] }))
    const [moved] = groups[fromG].tabs.splice(fromT, 1)

    let insertAt = toT
    // Compensate for the removed item shifting indices within the same group
    if (toG === fromG && fromT < toT) insertAt--
    groups[toG].tabs.splice(Math.max(0, insertAt), 0, moved)

    setNavGroups(groups)
    setDragItem(null)
    setDropPos(null)
  }

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

  const allTabs = navGroups.flatMap((g) => g.tabs)
  const activeTabConfig = allTabs.find((t) => t.id === activeTab)

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
              {isEditMode
                ? 'Drag items to reorder or move between sections. Click Done to save.'
                : 'Configure the email briefing form, themes, modules, and brand review.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveLayout}
                  className="text-xs font-medium px-3 py-1.5 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 transition-colors"
                  title="Edit navigation layout"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
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
              </>
            )}
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav
            className={`shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto py-4 bg-gray-50/60 dark:bg-gray-900/60 transition-[width] duration-150 ${isEditMode ? 'w-52' : 'w-44'}`}
          >
            {navGroups.map((group, gi) => (
              <div
                key={group.label}
                className={`mb-4 rounded-lg transition-colors ${
                  isEditMode && dropPos?.groupIdx === gi && dropPos?.tabIdx === group.tabs.length
                    ? 'bg-brand-primary/10 dark:bg-brand-primary/15'
                    : ''
                }`}
                onDragOver={(e) => {
                  if (!isEditMode) return
                  e.preventDefault()
                  // Only fire if not coming from a child (child handlers call stopPropagation)
                  setDropPos({ groupIdx: gi, tabIdx: group.tabs.length })
                }}
                onDrop={(e) => {
                  if (!isEditMode) return
                  e.preventDefault()
                  handleDrop()
                }}
              >
                <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none">
                  {group.label}
                </p>

                {group.tabs.map((tab, ti) => (
                  <div
                    key={tab.id}
                    className={`relative transition-opacity ${
                      dragItem?.groupIdx === gi && dragItem?.tabIdx === ti ? 'opacity-30' : ''
                    }`}
                    draggable={isEditMode}
                    onDragStart={(e) => {
                      if (!isEditMode) return
                      e.dataTransfer.effectAllowed = 'move'
                      setDragItem({ groupIdx: gi, tabIdx: ti })
                    }}
                    onDragOver={(e) => {
                      if (!isEditMode) return
                      e.preventDefault()
                      e.stopPropagation()
                      setDropPos({ groupIdx: gi, tabIdx: ti })
                    }}
                    onDrop={(e) => {
                      if (!isEditMode) return
                      e.stopPropagation()
                      handleDrop()
                    }}
                    onDragEnd={() => {
                      setDragItem(null)
                      setDropPos(null)
                    }}
                  >
                    {/* Drop indicator line — insert before this item */}
                    {isEditMode && dropPos?.groupIdx === gi && dropPos?.tabIdx === ti && (
                      <div className="absolute top-0 left-3 right-3 h-0.5 bg-brand-primary rounded-full z-10" />
                    )}

                    <div className={`flex items-center ${isEditMode ? 'pl-2 pr-1' : ''}`}>
                      {/* Drag handle */}
                      {isEditMode && (
                        <svg
                          className="shrink-0 mr-1.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing"
                          width="10"
                          height="14"
                          viewBox="0 0 10 14"
                          fill="currentColor"
                        >
                          <circle cx="2" cy="2" r="1.5" />
                          <circle cx="8" cy="2" r="1.5" />
                          <circle cx="2" cy="7" r="1.5" />
                          <circle cx="8" cy="7" r="1.5" />
                          <circle cx="2" cy="12" r="1.5" />
                          <circle cx="8" cy="12" r="1.5" />
                        </svg>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 text-left py-2 text-xs font-medium transition-colors truncate ${
                          isEditMode
                            ? 'pl-1 pr-2 text-gray-500 dark:text-gray-400'
                            : activeTab === tab.id
                            ? 'px-4 text-brand-primary dark:text-brand-accent bg-brand-primary/8 dark:bg-brand-primary/20 border-r-2 border-brand-primary dark:border-brand-accent'
                            : 'px-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        {tab.label}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty drop zone at end of group (shown in edit mode) */}
                {isEditMode && (
                  <div
                    className="h-3 mx-3"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDropPos({ groupIdx: gi, tabIdx: group.tabs.length })
                    }}
                    onDrop={(e) => {
                      e.stopPropagation()
                      handleDrop()
                    }}
                  />
                )}
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
            <div className={`flex-1 overflow-y-auto px-6 py-5 ${isEditMode ? 'pointer-events-none opacity-40 select-none' : ''}`}>
              {activeTab === 'general'         && <TabGeneral />}
              {activeTab === 'campaigns'       && <TabCampaigns />}
              {activeTab === 'lists'           && <TabLists />}
              {activeTab === 'signatures'      && <TabSignatures />}
              {activeTab === 'users'           && <TabUsers />}
              {activeTab === 'audit'           && <TabAuditLog />}
              {activeTab === 'themes'          && <TabThemes />}
              {activeTab === 'templates'       && <TabTemplates />}
              {activeTab === 'assets'          && <TabAssets />}
              {activeTab === 'modules'         && <TabModules />}
              {activeTab === 'greetings'       && <TabGreetings />}
              {activeTab === 'layout'          && <TabFormLayout />}
              {activeTab === 'guardian'        && <TabBrandGuardian />}
              {activeTab === 'disclaimers'     && <TabDisclaimers />}
              {activeTab === 'pardot'          && <TabPardot />}
              {activeTab === 'insights'        && <TabCampaignInsights />}
              {activeTab === 'approvals'       && <TabApprovals />}
              {activeTab === 'notifications'   && <TabNotifications />}
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
