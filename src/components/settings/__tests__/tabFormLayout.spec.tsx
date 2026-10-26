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
import { resolveRequired } from '../../../lib/briefRequirements'
import { resolveFieldOrder, resolveHidden, resolveSectionOrder } from '../../../lib/briefLayout'
import { TabFormLayout } from '../TabFormLayout'

type Layout = { sectionOrder: string[]; requiredFields: Record<string, boolean>; fieldOrder?: Record<string, string[]>; hiddenFields?: string[] }
const saved = () => (store.settings.briefLayout as Layout)
const headings = () => Array.from(document.querySelectorAll('ol > li > div > p')).map((p) => p.textContent)

beforeEach(() => { store.settings = createDefaultSettings() as unknown as Record<string, unknown> })
afterEach(cleanup)

describe('Form Layout settings', () => {
  it('lists the brief sections in order, each with the fields that can be required', () => {
    render(<TabFormLayout />)
    expect(headings()).toEqual(['Email identity', 'Message envelope', 'Sender details', 'Targeting', 'Audience', 'Deadlines', 'Supporting material', 'Tags'])
    expect(screen.getByRole('button', { name: 'Subject line: required' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Reply-to email: required' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('moves a section up or down and saves the order', async () => {
    render(<TabFormLayout />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move Deadlines up' })) })
    expect(resolveSectionOrder(saved().sectionOrder).indexOf('deadlines')).toBe(4)
    expect(headings().indexOf('Deadlines')).toBe(4)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move Deadlines down' })) })
    expect(resolveSectionOrder(saved().sectionOrder)).toEqual(resolveSectionOrder(undefined))
  })

  it('cannot move the first section up or the last one down', () => {
    render(<TabFormLayout />)
    expect((screen.getByRole('button', { name: 'Move Email identity up' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Move Tags down' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('makes a field required or optional, and the saved choice takes effect', async () => {
    render(<TabFormLayout />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reply-to email: required' })) })
    expect(resolveRequired(saved().requiredFields)['campaign.replyToEmail']).toBe(true)
    expect(screen.getByRole('button', { name: 'Reply-to email: required' }).getAttribute('aria-pressed')).toBe('true')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Subject line: required' })) })
    expect(resolveRequired(saved().requiredFields)['campaign.subjectLine']).toBe(false)
    expect(screen.getByRole('button', { name: 'Subject line: required' }).textContent).toBe('Optional')
  })

  it('offers a reset only once something has been changed, and it puts everything back', async () => {
    render(<TabFormLayout />)
    expect(screen.queryByRole('button', { name: 'Reset to defaults' })).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move Deadlines up' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reply-to email: required' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' })) })
    expect(saved()).toEqual({ sectionOrder: [], requiredFields: {}, fieldOrder: {}, hiddenFields: [] })
    expect(screen.queryByRole('button', { name: 'Reset to defaults' })).toBeNull()
  })

  it('moves a field up or down within its own section and saves the order', async () => {
    render(<TabFormLayout />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move UTM campaign up' })) })
    expect(resolveFieldOrder('identity', saved().fieldOrder).slice(-2)).toEqual(['campaign.utmCampaign', 'campaign.emailDescription'])
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move UTM campaign down' })) })
    expect(resolveFieldOrder('identity', saved().fieldOrder)).toEqual(resolveFieldOrder('identity', undefined))
  })

  it('cannot move the first field of a section up or the last one down', () => {
    render(<TabFormLayout />)
    expect((screen.getByRole('button', { name: 'Move Email type up' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Move UTM campaign down' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Move Subject line up' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Move Preview text down' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('switches a field off and on, and says it is off', async () => {
    render(<TabFormLayout />)
    const toggle = screen.getByRole('switch', { name: 'Show UTM campaign' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    await act(async () => { fireEvent.click(toggle) })
    expect(resolveHidden(saved().hiddenFields).has('campaign.utmCampaign')).toBe(true)
    expect(screen.getByRole('switch', { name: 'Show UTM campaign' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText(/Off: not on the form/)).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Show UTM campaign' })) })
    expect(resolveHidden(saved().hiddenFields).size).toBe(0)
  })

  it('a field that is switched off is shown as not asked for, and remembers whether it is required for when it is switched back on', async () => {
    render(<TabFormLayout />)
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Show Subject line' })) })
    const pill = screen.getByRole('button', { name: 'Subject line: required' })
    expect(pill.title).toMatch(/never asked for/)
    expect(pill.className).toContain('opacity-40')
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Show Subject line' })) })
    expect(screen.getByRole('button', { name: 'Subject line: required' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('reset puts back the field order and switched-off fields too', async () => {
    render(<TabFormLayout />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move UTM campaign up' })) })
    await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Show Preview text' })) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' })) })
    expect(resolveFieldOrder('identity', saved().fieldOrder)).toEqual(resolveFieldOrder('identity', undefined))
    expect(resolveHidden(saved().hiddenFields).size).toBe(0)
  })

  it('still switches parts of the review step on and off', async () => {
    render(<TabFormLayout />)
    const toggle = screen.getByRole('switch', { name: 'Show Export Options' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    await act(async () => { fireEvent.click(toggle) })
    const field = (store.settings.formFields as { id: string; visible: boolean }[]).find((f) => f.id === 'review.exportOptions')
    expect(field?.visible).toBe(false)
  })
})
