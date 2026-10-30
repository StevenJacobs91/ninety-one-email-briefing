// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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
      return { settings, updateSettings: (patch: Record<string, unknown>) => { store.settings = { ...store.settings, ...patch }; store.listeners.forEach((l) => l()) } }
    },
  }
})

import { createDefaultSettings } from '../../../lib/settingsDefaults'
import { checklistSettings } from '../../../lib/preSendChecklist'
import { TabChecklist } from '../TabChecklist'

const saved = () => checklistSettings(store.settings as never)

beforeEach(() => {
  store.settings = { ...createDefaultSettings(), customRoles: [{ id: 'role-abc', name: 'Designer', colour: '#000000', baseRole: 'requester', opensOn: 'form' }] } as unknown as Record<string, unknown>
})
afterEach(cleanup)

const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement

describe('Settings → Checklist', () => {
  it('starts with producers and admins seeing the buttons, and every other role, custom ones included, listed unticked', () => {
    render(<TabChecklist />)
    expect(box('Producer').checked).toBe(true)
    expect(box('Admin').checked).toBe(true)
    expect(box('Requester').checked).toBe(false)
    expect(box('Designer').checked).toBe(false)
  })

  it('saves who sees the buttons as each role is ticked or unticked', () => {
    render(<TabChecklist />)
    fireEvent.click(box('Designer'))
    expect(saved().visibleTo).toEqual(['producer', 'admin', 'role-abc'])
    fireEvent.click(box('Producer'))
    expect(saved().visibleTo).toEqual(['admin', 'role-abc'])
  })

  it('switches the buttons off for everyone', () => {
    render(<TabChecklist />)
    fireEvent.click(screen.getByRole('switch', { name: 'Show the checklist buttons' }))
    expect(saved().enabled).toBe(false)
  })

  it('saves the recipients from a pasted list, and says which entries were not email addresses', () => {
    render(<TabChecklist />)
    const area = screen.getByLabelText('Recipients') as HTMLTextAreaElement
    fireEvent.change(area, { target: { value: 'a@x.com, b@y.com\nnobody' } })
    fireEvent.blur(area)
    expect(saved().recipients).toEqual(['a@x.com', 'b@y.com'])
    expect(screen.getByRole('alert').textContent).toContain('nobody')
    expect(area.value).toBe('a@x.com\nb@y.com')
  })

  it('saves the subject, and a blank one goes back to the default', () => {
    render(<TabChecklist />)
    const input = screen.getByLabelText('Email subject') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Please sign off: {{emailName}}' } })
    fireEvent.blur(input)
    expect(saved().subjectTemplate).toBe('Please sign off: {{emailName}}')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.blur(input)
    expect(saved().subjectTemplate).toBe('Pre-send checklist: {{emailName}}')
    expect(input.value).toBe('Pre-send checklist: {{emailName}}')
  })

  it('says whether the Power Automate flow that sends it is set up', () => {
    render(<TabChecklist />)
    expect(screen.getByText(/not set up yet/i)).toBeTruthy()
    act(() => {
      const pa = store.settings.powerAutomate as Record<string, unknown>
      store.settings = { ...store.settings, powerAutomate: { ...pa, enabled: true, checklistFlow: { webhookUrl: 'https://flow.test/x', enabled: true } } }
      store.listeners.forEach((l) => l())
    })
    expect(screen.queryByText(/not set up yet/i)).toBeNull()
    expect(screen.getByText(/The checklist flow is set up/i)).toBeTruthy()
  })
})
