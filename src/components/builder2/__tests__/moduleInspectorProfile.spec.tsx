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
