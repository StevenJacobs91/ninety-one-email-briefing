// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabAssets } from '../TabAssets'

// jsdom never loads images, so stand in for the browser: report a size, or an error for a broken address.
class FakeImage {
  naturalWidth = 1280
  naturalHeight = 540
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(url: string) { setTimeout(() => (url.includes('broken') ? this.onerror?.() : this.onload?.()), 0) }
}

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage)
  state.updateSettings.mockClear()
  state.settings = { assets: [{ id: 'i1', name: 'Photo', url: 'https://cdn/photo.jpg', category: 'images' }] }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].assets

describe('Asset library: Images and dimensions', () => {
  it('has an Images category to file an asset under, and a tab that lists them', () => {
    render(<TabAssets />)
    expect(screen.getByRole('button', { name: /^Images \(1\)/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Add Asset/ }))
    fireEvent.change(screen.getByPlaceholderText(/706930897/), { target: { value: 'Team' } })
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://cdn/team.jpg' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'images' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Asset' }))
    expect(saved().find((a: { name: string }) => a.name === 'Team').category).toBe('images')
  })

  it('shows the exact pixel dimensions of the image in the form once its address is entered', async () => {
    render(<TabAssets />)
    fireEvent.click(screen.getByRole('button', { name: /Add Asset/ }))
    expect(screen.getByLabelText('Dimensions').textContent).toBe('Shown once a URL is entered')
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://cdn/team.jpg' } })
    await waitFor(() => expect(screen.getByLabelText('Dimensions').textContent).toBe('1280 × 540 px'))
  })

  it('says so when the image cannot be read', async () => {
    render(<TabAssets />)
    fireEvent.click(screen.getByRole('button', { name: /Add Asset/ }))
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://cdn/broken.jpg' } })
    await waitFor(() => expect(screen.getByLabelText('Dimensions').textContent).toBe('Could not read the image'))
  })

  it('shows each card\'s dimensions once its image has loaded', () => {
    render(<TabAssets />)
    const img = screen.getByAltText('Photo') as HTMLImageElement
    Object.defineProperty(img, 'naturalWidth', { value: 600 })
    Object.defineProperty(img, 'naturalHeight', { value: 250 })
    fireEvent.load(img)
    expect(screen.getByText('600 × 250 px')).toBeTruthy()
  })
})
