// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings }) }))

import { AssetLibraryPicker } from '../AssetLibraryPicker'

const assets = [
  { id: 'a', name: 'Marc Lindley', url: 'https://cdn/marc.png', category: 'profile', altText: 'Marc Lindley, portfolio manager' },
  { id: 'b', name: 'Jane Smith', url: 'https://cdn/jane.png', category: 'profile' },
  { id: 'c', name: 'Bridge header', url: 'https://cdn/bridge.jpg', category: 'header' },
]

beforeEach(() => { state.settings = { assets } })
afterEach(cleanup)

function setup(over: Partial<React.ComponentProps<typeof AssetLibraryPicker>> = {}) {
  const onChange = vi.fn()
  render(<AssetLibraryPicker category="profile" label="Profile photo" url="https://cdn/old.png" alt="" onChange={onChange} {...over} />)
  return onChange
}

describe('AssetLibraryPicker', () => {
  it('shows only the chosen category of the media library, named by it', () => {
    setup()
    expect(screen.getByText('Profiles')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Marc Lindley/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Jane Smith/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Bridge header/ })).toBeNull()
  })

  it('picking an image replaces the photo and its alt text (the library\'s, or the name)', () => {
    const onChange = setup()
    fireEvent.click(screen.getByRole('button', { name: /Marc Lindley/ }))
    expect(onChange).toHaveBeenCalledWith({ url: 'https://cdn/marc.png', alt: 'Marc Lindley, portfolio manager' })
    fireEvent.click(screen.getByRole('button', { name: /Jane Smith/ }))
    expect(onChange).toHaveBeenLastCalledWith({ url: 'https://cdn/jane.png', alt: 'Jane Smith' })
  })

  it('searches the library by name', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Search Profiles'), { target: { value: 'jane' } })
    expect(screen.queryByRole('button', { name: /Marc Lindley/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Jane Smith/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search Profiles'), { target: { value: 'zzz' } })
    expect(screen.getByText(/No Profiles match/)).toBeTruthy()
  })

  it('says how to fill an empty category, and still takes a pasted URL and alt text', () => {
    state.settings = { assets: [] }
    const onChange = setup()
    expect(screen.getByText(/No Profiles in the media library yet/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Profile photo URL'), { target: { value: 'https://cdn/x.png' } })
    expect(onChange).toHaveBeenCalledWith({ url: 'https://cdn/x.png' })
    fireEvent.change(screen.getByLabelText('Profile photo alt text'), { target: { value: 'Someone' } })
    expect(onChange).toHaveBeenLastCalledWith({ alt: 'Someone' })
  })

  it('marks the image in use', () => {
    setup({ url: 'https://cdn/jane.png' })
    expect(screen.getByRole('button', { name: /Jane Smith/ }).getAttribute('aria-pressed')).toBe('true')
  })
})
