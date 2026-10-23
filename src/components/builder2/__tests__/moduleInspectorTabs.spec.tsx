// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { assets: [] } }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const sides = (v = '') => ({ top: v, right: v, bottom: v, left: v })
const module_: BuildModule = { instanceId: 'a', moduleName: 'Body content', slot: 'body', repeats: {}, regions: {}, images: {}, boundFields: {} }
const full: ModuleInfo = {
  fields: [{ key: 'r0', rawKind: 'p', kind: 'text', value: 'Hello', label: 'Text', locked: false }],
  boxes: [{ key: 'container', label: 'Module container', allowMargin: false, read: { margin: sides(), padding: sides('0px'), class: '' } }],
  repeats: [],
  images: ['https://x/y.png'],
  imageKinds: ['placeholder'],
}

function setup(info: ModuleInfo = full, mod: BuildModule = module_) {
  render(
    <ModuleInspector module={mod} info={info} headerTypes={[]} headerTypeId="" onRegion={vi.fn()} onRepeat={vi.fn()}
      onImage={vi.fn()} onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} />,
  )
}

describe('ModuleInspector tabs', () => {
  it('offers Content, Media and Style, opening on Content', () => {
    setup()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Content', 'Media', 'Style'])
    expect(screen.getByRole('tab', { name: 'Content' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByLabelText('Text')).toBeTruthy()
    expect(screen.queryByLabelText('Image URL')).toBeNull()
    expect(screen.queryByLabelText('Padding top')).toBeNull()
  })

  it('shows images on Media and spacing on Style', () => {
    setup()
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }))
    expect(screen.getByLabelText('Image URL')).toBeTruthy()
    expect(screen.queryByLabelText('Text')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Style' }))
    expect(screen.getByLabelText('Padding top')).toBeTruthy()
  })

  it('leaves out a tab that has nothing in it', () => {
    setup({ ...full, images: [] })
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Content', 'Style'])
  })

  it('moves between tabs with the arrow keys', () => {
    setup()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Content' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Media' }).getAttribute('aria-selected')).toBe('true')
  })
})
