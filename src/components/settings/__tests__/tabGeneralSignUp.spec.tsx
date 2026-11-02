// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, listeners: new Set<() => void>() }))

vi.mock('../../../contexts/SettingsContext', async () => {
  const { createDefaultSettings } = await import('../../../lib/settingsDefaults')
  store.settings = createDefaultSettings() as unknown as Record<string, unknown>
  return {
    useSettings: () => {
      const settings = useSyncExternalStore(
        (cb) => { store.listeners.add(cb); return () => store.listeners.delete(cb) },
        () => store.settings,
      )
      return {
        settings,
        updateSettings: (patch: Record<string, unknown>) => { store.settings = { ...store.settings, ...patch }; store.listeners.forEach((l) => l()) },
        resetSettings: () => {},
      }
    },
  }
})
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile: { id: 'u1', role: 'admin', customRoleId: null } }) }))
vi.mock('../../../hooks/useAuditLog', () => ({ useAuditLog: () => ({ log: () => {} }) }))

import { createDefaultSettings } from '../../../lib/settingsDefaults'
import { TabGeneral } from '../TabGeneral'

beforeEach(() => { store.settings = createDefaultSettings() as unknown as Record<string, unknown> })
afterEach(cleanup)

const signUpSwitch = () => screen.getByRole('switch', { name: /sign-up link/i })

describe('the sign-up link switch in Settings → General', () => {
  it('is on until a team switches it off, because the link has always been there', () => {
    render(<TabGeneral />)
    expect(signUpSwitch().getAttribute('aria-checked')).toBe('true')
  })

  it('switches the link off and back on, and the setting follows', () => {
    render(<TabGeneral />)
    fireEvent.click(signUpSwitch())
    expect(store.settings.showSignUpLink).toBe(false)
    expect(signUpSwitch().getAttribute('aria-checked')).toBe('false')
    fireEvent.click(signUpSwitch())
    expect(store.settings.showSignUpLink).toBe(true)
  })

  it('says plainly that it hides the link and does not turn sign-ups off', () => {
    render(<TabGeneral />)
    expect(screen.getByText(/does not turn sign-ups off/i)).toBeTruthy()
  })
})
