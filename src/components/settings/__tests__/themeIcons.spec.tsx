// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabThemes } from '../TabThemes'

beforeEach(() => {
  state.updateSettings.mockClear()
  state.settings = { brandThemes: [{ id: 'agulhas-gold', label: 'Agulhas Indigo / Gazania Gold', primary: '#221b3b', accent: '#cf6f13', tint01: '#2f2850', tint02: '#3d3660', tint03: '#4b4470', defaultTextColour: '#e8e5ce' }] }
})
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].brandThemes

function openEdit() {
  fireEvent.click(screen.getByRole('button', { name: /edit/i }))
}

describe('Brand Themes: 35-year logo and icons', () => {
  it('maps the 35 year logo and every icon type, each showing the variable to use in module code', () => {
    render(<TabThemes />)
    openEdit()
    expect(screen.getByLabelText(/35 Year Logo URL/)).toBeTruthy()
    for (const [label, token] of [['Clock', 'iconClock'], ['Calendar', 'iconCalendar'], ['Calendar \\(large\\)', 'iconCalendarLarge'], ['Location', 'iconLocation'], ['Document', 'iconDocument'], ['Arrow \\(go\\)', 'iconArrow'], ['Facebook', 'iconFacebook'], ['Apple Podcasts', 'iconApplePodcasts']]) {
      const field = screen.getByLabelText(new RegExp(`^${label} Icon URL`))
      expect(field.closest('div')?.textContent).toContain(`{{${token}}}`)
    }
    expect(screen.getByText('{{anniversary}}')).toBeTruthy()
    expect(screen.getByText('{{logo}}')).toBeTruthy()
  })

  it('saves an icon and the 35 year logo with the theme', () => {
    render(<TabThemes />)
    openEdit()
    fireEvent.change(screen.getByLabelText(/^Clock Icon URL/), { target: { value: 'https://cdn/clock.png' } })
    fireEvent.change(screen.getByLabelText(/35 Year Logo URL/), { target: { value: 'https://cdn/35.png' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    const theme = saved().find((t: { id: string }) => t.id === 'agulhas-gold')
    expect(theme.iconUrls.clock).toBe('https://cdn/clock.png')
    expect(theme.anniversaryLogoUrl).toBe('https://cdn/35.png')
  })
})
