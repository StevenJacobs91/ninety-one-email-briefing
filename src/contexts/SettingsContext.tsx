import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AppSettings } from '../types/settings.types'
import { createDefaultSettings } from '../lib/settingsDefaults'

const STORAGE_KEY = 'ni-email-brief-settings'
const SETTINGS_VERSION_KEY = 'ni-email-brief-settings-version'
const CURRENT_VERSION = 1

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings: () => void
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function loadSettings(): AppSettings {
  try {
    const version = localStorage.getItem(SETTINGS_VERSION_KEY)
    if (version !== String(CURRENT_VERSION)) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem(SETTINGS_VERSION_KEY, String(CURRENT_VERSION))
      return createDefaultSettings()
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppSettings
      // Merge with defaults to pick up any new fields
      const defaults = createDefaultSettings()
      return {
        ...defaults,
        ...parsed,
        brandGuardian: { ...defaults.brandGuardian, ...parsed.brandGuardian },
        senderDefaults: { ...defaults.senderDefaults, ...parsed.senderDefaults },
        formDefaults: { ...defaults.formDefaults, ...parsed.formDefaults },
        pardot: { ...defaults.pardot, ...(parsed.pardot ?? {}) },
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return createDefaultSettings()
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    localStorage.setItem(SETTINGS_VERSION_KEY, String(CURRENT_VERSION))
  } catch {
    // Storage full or unavailable
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetSettings = useCallback(() => {
    const defaults = createDefaultSettings()
    setSettings(defaults)
    saveSettings(defaults)
  }, [])

  const openSettings = useCallback(() => setIsOpen(true), [])
  const closeSettings = useCallback(() => setIsOpen(false), [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isOpen, openSettings, closeSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
