// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { assets: [] } }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const mod: BuildModule = { instanceId: 'a', moduleName: 'Disclaimer', slot: 'disclaimer', repeats: {}, regions: {}, images: {}, boundFields: {} }
const info: ModuleInfo = {
  fields: [{ key: 'root.0', rawKind: 'paragraph', kind: 'rich', value: 'Old wording', label: 'Text', locked: false }],
  boxes: [], repeats: [], images: [], imageKinds: [],
}
const options = [
  { id: 'za', label: 'South Africa — Standard', region: 'ZA' },
  { id: 'uk', label: 'United Kingdom — Standard', region: 'UK' },
]

function setup(selectedId: string, onSelect = vi.fn()) {
  render(
    <ModuleInspector module={mod} info={info} headerTypes={[]} headerTypeId="" onRegion={vi.fn()} onRepeat={vi.fn()} onImage={vi.fn()}
      onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()}
      disclaimer={{ options, selectedId, preview: 'Settings wording here', onSelect }} />,
  )
  return onSelect
}

describe('ModuleInspector disclaimer', () => {
  it('offers the disclaimers from Settings, the default selected, plus the module\'s own wording', () => {
    setup('za')
    const select = screen.getByLabelText('Disclaimer') as HTMLSelectElement
    expect(select.value).toBe('za')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['South Africa — Standard · ZA', 'United Kingdom — Standard · UK', "The module's own wording"])
  })

  it('shows the chosen wording and hides the module\'s own fields, which it replaces', () => {
    setup('za')
    expect(screen.getByText('Settings wording here')).toBeTruthy()
    expect(screen.queryByLabelText('Text')).toBeNull()
  })

  it('choosing a different disclaimer reports it', () => {
    const onSelect = setup('za')
    fireEvent.change(screen.getByLabelText('Disclaimer'), { target: { value: 'uk' } })
    expect(onSelect).toHaveBeenCalledWith('uk')
  })

  it('with the module\'s own wording chosen its fields come back', () => {
    setup('module')
    expect(screen.getByLabelText('Text')).toBeTruthy()
  })
})
