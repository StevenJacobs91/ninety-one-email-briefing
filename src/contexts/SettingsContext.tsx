import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { AppSettings, HeaderTypeConfig } from '../types/settings.types'
import { createDefaultSettings, DEFAULT_HEADER_TYPES } from '../lib/settingsDefaults'
import { useAuth } from './AuthContext'
import { fetchSettings, upsertSettings } from '../lib/supabaseQueries'

const SAVE_DEBOUNCE_MS = 1000

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  loading: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const teamId = profile?.teamId
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Fetch settings from Supabase on mount / team change
  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchSettings(teamId).then((remote) => {
      if (cancelled) return
      if (remote) {
        // Merge with defaults to pick up any new fields
        const defaults = createDefaultSettings()
        setSettings({
          ...defaults,
          ...remote,
          brandGuardian: { ...defaults.brandGuardian, ...remote.brandGuardian },
          senderDefaults: { ...defaults.senderDefaults, ...remote.senderDefaults },
          formDefaults: { ...defaults.formDefaults, ...remote.formDefaults },
          pardot: { ...defaults.pardot, ...(remote.pardot ?? {}) },
          campaigns: remote.campaigns ?? defaults.campaigns,
          signoffs: remote.signoffs ?? defaults.signoffs,
          customEmailTypes: remote.customEmailTypes ?? defaults.customEmailTypes,
          customClientGroups: remote.customClientGroups ?? defaults.customClientGroups,
          customChannels: remote.customChannels ?? defaults.customChannels,
          customRegions: remote.customRegions ?? defaults.customRegions,
          sendTimeOptimisation: { ...defaults.sendTimeOptimisation, ...(remote.sendTimeOptimisation ?? {}) },
          benchmarks: { ...defaults.benchmarks, ...(remote.benchmarks ?? {}) },
          audienceHealth: { ...defaults.audienceHealth, ...(remote.audienceHealth ?? {}) },
          greetings: remote.greetings ?? defaults.greetings,
          rolePermissions: remote.rolePermissions
            ? {
                admin: { ...defaults.rolePermissions.admin, ...remote.rolePermissions.admin },
                producer: { ...defaults.rolePermissions.producer, ...remote.rolePermissions.producer },
                requester: { ...defaults.rolePermissions.requester, ...remote.rolePermissions.requester },
              }
            : defaults.rolePermissions,
          userGroups: remote.userGroups ?? defaults.userGroups,
          headers: (() => {
            if (!remote.headers) return DEFAULT_HEADER_TYPES
            // Merge: keep all built-in defaults (with user edits applied), append any custom types
            const remoteMap = new Map((remote.headers as HeaderTypeConfig[]).map((h) => [h.id, h]))
            const merged = DEFAULT_HEADER_TYPES.map((d) => remoteMap.has(d.id) ? { ...d, ...remoteMap.get(d.id) } : d)
            const customTypes = (remote.headers as HeaderTypeConfig[]).filter((h) => !DEFAULT_HEADER_TYPES.some((d) => d.id === h.id))
            return [...merged, ...customTypes]
          })(),
          notifications: remote.notifications
            ? {
                ...defaults.notifications,
                ...remote.notifications,
                // Merge events: ensure any new event types added in updates are included
                events: defaults.notifications.events.map((defaultEvt) => {
                  const saved = remote.notifications?.events?.find(
                    (e) => e.eventType === defaultEvt.eventType
                  )
                  return saved ? { ...defaultEvt, ...saved } : defaultEvt
                }),
              }
            : defaults.notifications,
        })
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [teamId])

  // Debounced save to Supabase whenever settings change
  const scheduleRemoteSave = useCallback(() => {
    if (!teamId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      upsertSettings(teamId, settingsRef.current).catch((err) => {
        console.error('Settings save failed:', err)
      })
    }, SAVE_DEBOUNCE_MS)
  }, [teamId])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    scheduleRemoteSave()
  }, [scheduleRemoteSave])

  const resetSettings = useCallback(() => {
    const defaults = createDefaultSettings()
    setSettings(defaults)
    scheduleRemoteSave()
  }, [scheduleRemoteSave])

  const openSettings = useCallback(() => setIsOpen(true), [])
  const closeSettings = useCallback(() => setIsOpen(false), [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isOpen, openSettings, closeSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
