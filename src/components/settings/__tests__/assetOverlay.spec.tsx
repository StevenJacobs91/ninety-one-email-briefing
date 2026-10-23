// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabAssets } from '../TabAssets'

beforeEach(() => {
  state.updateSettings.mockClear()
  state.settings = { assets: [
    { id: 'h1', name: 'Bridge', url: 'https://cdn/bridge.jpg', category: 'header', colourOverlay: '#221b3b', altText: 'Bridge' },
    { id: 'h2', name: 'Odd', url: 'https://cdn/odd.jpg', category: 'header', colourOverlay: '#123456', altText: 'Odd' },
  ] }
})
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].assets

function openNew() {
  fireEvent.click(screen.getByRole('button', { name: /Add Asset/ }))
  fireEvent.change(screen.getByPlaceholderText(/706930897/), { target: { value: 'New header' } })
  fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://cdn/new.jpg' } })
}

describe('Asset colour overlay', () => {
  it('offers Ninety One\'s six primary colours by name, and no overlay, instead of a free colour picker', () => {
    render(<TabAssets />)
    fireEvent.click(screen.getByRole('button', { name: /Add Asset/ }))
    const group = screen.getByRole('radiogroup', { name: 'Colour Overlay' })
    const names = within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))
    expect(names).toEqual(['No overlay', 'Leatherback Green', 'Marula Green', 'Pinotage Burgundy', 'Agulhas Indigo', 'Galjoen Gray', 'Springbok Cream'])
    expect(document.querySelector('input[type="color"]')).toBeNull()
  })

  it('choosing a colour saves its exact brand hex with the asset', () => {
    render(<TabAssets />)
    openNew()
    fireEvent.click(screen.getByRole('radio', { name: 'Marula Green' }))
    expect(screen.getByText(/Marula Green · #0a3323/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }))
    expect(saved().find((a: { name: string }) => a.name === 'New header').colourOverlay).toBe('#0a3323')
  })

  it('starts with no overlay, and can go back to none', () => {
    render(<TabAssets />)
    openNew()
    expect((screen.getByRole('radio', { name: 'No overlay' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Agulhas Indigo' }))
    fireEvent.click(screen.getByRole('radio', { name: 'No overlay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }))
    expect(saved().find((a: { name: string }) => a.name === 'New header').colourOverlay).toBe('')
  })

  it('editing an asset opens on its colour', () => {
    render(<TabAssets />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect((screen.getByRole('radio', { name: 'Agulhas Indigo' }) as HTMLInputElement).checked).toBe(true)
  })

  it('an asset saved with some other colour keeps it, shown as custom, until a brand colour is chosen', () => {
    render(<TabAssets />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1])
    expect((screen.getByRole('radio', { name: 'Custom #123456' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Leatherback Green' }))
    expect((screen.getByRole('radio', { name: 'Leatherback Green' }) as HTMLInputElement).checked).toBe(true)
  })
})
