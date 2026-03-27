import { useState, useEffect, useCallback } from 'react'

type Mode = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'ni-dark-mode'

function getSystemPreference(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyClass(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
}

export function useDarkMode() {
  const [mode, setModeState] = useState<Mode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Mode | null
    return stored ?? 'system'
  })

  const resolvedDark = mode === 'system' ? getSystemPreference() : mode === 'dark'

  useEffect(() => {
    applyClass(resolvedDark)
  }, [resolvedDark])

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => applyClass(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((m: Mode) => {
    setModeState(m)
    localStorage.setItem(STORAGE_KEY, m)
  }, [])

  return { mode, setMode, isDark: resolvedDark }
}
