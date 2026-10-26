// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: { assets: [{ id: 'a', name: 'Marc Lindley', url: 'https://cdn/marc.png', category: 'profile', altText: 'Marc' }] } }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const mod: BuildModule = { instanceId: 'a', moduleName: 'PM 1', slot: null, repeats: {}, regions: {}, images: {}, boundFields: {} }
const info: ModuleInfo = {
  fields: [{ key: 'r0', rawKind: 'h2', kind: 'text', value: 'Heading', label: 'Heading', locked: false }],
  boxes: [], repeats: [], images: ['https://x/profile_marc_261x377.png'], imageKinds: ['profile'],
}

describe('ModuleInspector media library default', () => {
  const original = state.settings
  afterEach(() => { state.settings = original })
  // A speaker module whose placeholder is a plain grey box, with nothing in its file name to say it is a photo.
  const placeholder: ModuleInfo = { ...info, images: ['https://placehold.co/300x225/424242/ffffff.png'], imageKinds: ['placeholder'] }
  const render1 = (imageCategory?: 'profile') => render(<ModuleInspector module={{ ...mod, moduleName: 'Speakers - Slim' }} info={placeholder} headerTypes={[]} headerTypeId="" imageCategory={imageCategory}
    onRegion={vi.fn()} onRepeat={vi.fn()} onImage={vi.fn()} onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} />)

  it('starts in Graphics for an ordinary module', () => {
    state.settings = { assets: [{ id: 'g', name: 'Elephants', url: 'https://cdn/e.png', category: 'graphics' }, { id: 'a', name: 'Marc Lindley', url: 'https://cdn/marc.png', category: 'profile' }] } as never
    render1()
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }))
    expect(screen.getByText('Graphics')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Elephants/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Marc Lindley/ })).toBeNull()
  })

  it('starts in Profiles for a People module, and can look in Graphics instead, and back', () => {
    state.settings = { assets: [{ id: 'g', name: 'Elephants', url: 'https://cdn/e.png', category: 'graphics' }, { id: 'a', name: 'Marc Lindley', url: 'https://cdn/marc.png', category: 'profile' }] } as never
    render1('profile')
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }))
    expect(screen.getByText('Profiles')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Marc Lindley/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Elephants/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Browse Graphics instead' }))
    expect(screen.getByText('Graphics')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Elephants/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Browse Profiles instead' }))
    expect(screen.getByRole('button', { name: /Marc Lindley/ })).toBeTruthy()
  })
})

describe('ModuleInspector profile photo', () => {
  it('offers the Profiles library on the Media tab and replaces the photo with the pick', () => {
    const onImage = vi.fn()
    render(<ModuleInspector module={mod} info={info} headerTypes={[]} headerTypeId="" onRegion={vi.fn()} onRepeat={vi.fn()}
      onImage={onImage} onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }))
    expect(screen.getByText('Profiles')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Marc Lindley/ }))
    expect(onImage).toHaveBeenCalledWith('img:0', { src: 'https://cdn/marc.png', alt: 'Marc' })
  })
})
