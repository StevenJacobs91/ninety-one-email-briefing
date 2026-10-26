import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { normaliseTints } from '../lib/brandTints'
import type { AppSettings, HeaderTypeConfig, BrandThemeConfig } from '../types/settings.types'
import { createDefaultSettings, mergeHtmlModules, mergePowerAutomate, DEFAULT_HEADER_TYPES, DEFAULT_BRAND_THEMES } from '../lib/settingsDefaults'
import { mergeFormSteps } from '../lib/briefTabs'
import { useAuth } from './AuthContext'
import { fetchSettings, upsertSettings } from '../lib/supabaseQueries'
import { protectThemeAssets } from '../lib/themeAssetGuard'

const SAVE_DEBOUNCE_MS = 1000
const LOAD_RETRY_MS = 5000

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
  // Nothing is saved until the team's settings have loaded (or it is known there are none), so the built-in defaults a page
  // starts on can never be written over what the team saved. The themes as loaded let a save tell a URL cleared on purpose
  // from one this session never saw.
  const loadedOkRef = useRef(false)
  const loadedThemesRef = useRef<BrandThemeConfig[]>([])

  // Fetch settings from Supabase on mount / team change
  useEffect(() => {
    if (!teamId) {
      setLoading(false)
      return
    }

    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    loadedOkRef.current = false
    setLoading(true)

    const load = () => fetchSettings(teamId).then((remote) => {
      if (cancelled) return
      if (remote) {
        // Merge with defaults to pick up any new fields
        const defaults = createDefaultSettings()
        const next: AppSettings = {
          ...defaults,
          ...remote,
          // Merge brand themes: apply user edits to built-in IDs, append custom themes
          brandThemes: (() => {
            if (!remote.brandThemes) return DEFAULT_BRAND_THEMES
            const remoteMap = new Map((remote.brandThemes as BrandThemeConfig[]).map((t) => [t.id, t]))
            // Saved tints that are still the old calculated ones move to the brand's exact tints.
            const merged = DEFAULT_BRAND_THEMES.map((d) => remoteMap.has(d.id) ? normaliseTints({ ...d, ...remoteMap.get(d.id) }) : d)
            const customThemes = (remote.brandThemes as BrandThemeConfig[]).filter((t) => !DEFAULT_BRAND_THEMES.some((d) => d.id === t.id))
            return [...merged, ...customThemes]
          })(),
          // Every module in the library has an entry here, with what was saved for it; ones added in Settings are kept.
          htmlModules: mergeHtmlModules(remote.htmlModules),
          brandGuardian: { ...defaults.brandGuardian, ...remote.brandGuardian },
          senderDefaults: { ...defaults.senderDefaults, ...remote.senderDefaults },
          formDefaults: { ...defaults.formDefaults, ...remote.formDefaults },
          pardot: { ...defaults.pardot, ...(remote.pardot ?? {}) },
          powerAutomate: mergePowerAutomate(remote.powerAutomate),
          formSteps: mergeFormSteps(remote.formSteps),
          briefLayout: { sectionOrder: [], requiredFields: {}, ...(remote.briefLayout ?? {}) },
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
        }
        setSettings(next)
        loadedThemesRef.current = next.brandThemes
      } else {
        // The team has not saved settings yet, so the defaults are the starting point.
        loadedThemesRef.current = settingsRef.current.brandThemes
      }
      loadedOkRef.current = true
      setLoading(false)
    }).catch((err: unknown) => {
      if (cancelled) return
      // Not loaded: changes are not saved, so the defaults cannot overwrite the team's settings. Try again shortly.
      console.error('Settings could not be loaded; changes will not be saved until they can:', err)
      setLoading(false)
      retry = setTimeout(load, LOAD_RETRY_MS)
    })

    load()
    return () => {
      cancelled = true
      if (retry) clearTimeout(retry)
    }
  }, [teamId])

  // Debounced save to Supabase whenever settings change
  const scheduleRemoteSave = useCallback(() => {
    if (!teamId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!loadedOkRef.current) return
      try {
        const current = settingsRef.current
        // What is stored now is checked first: a theme URL this session never saw is kept, not overwritten with an empty one.
        const stored = await fetchSettings(teamId)
        let toSave = current
        if (stored?.brandThemes) {
          const { themes, restored } = protectThemeAssets(current.brandThemes, loadedThemesRef.current, stored.brandThemes)
          if (restored > 0) {
            toSave = { ...current, brandThemes: themes }
            setSettings((prev) => ({ ...prev, brandThemes: themes }))
          }
        }
        await upsertSettings(teamId, toSave)
        loadedThemesRef.current = toSave.brandThemes
      } catch (err) {
        console.error('Settings save failed:', err)
      }
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
