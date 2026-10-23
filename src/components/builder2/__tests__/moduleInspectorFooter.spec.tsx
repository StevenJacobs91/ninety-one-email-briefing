// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { assets: [] } }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { FieldInfo, ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const mod: BuildModule = { instanceId: 'a', moduleName: 'Footer v1', slot: 'footer', repeats: {}, regions: {}, images: {}, boundFields: {} }
const field = (key: string, label: string, section?: FieldInfo['section']): FieldInfo =>
  ({ key, rawKind: 'detail', kind: 'text', value: label, label, locked: false, section })
const info: ModuleInfo = {
  fields: [
    field('root.0', 'Message line', 'signoff'),
    field('root.1', 'Kind regards line', 'signature'),
    field('root.2', 'Visit website link', 'tail'),
  ],
  boxes: [], repeats: [], images: [], imageKinds: [],
  footer: { hasSignoff: true, hasSignature: true, hasSocial: true },
}

function setup(over: Partial<NonNullable<React.ComponentProps<typeof ModuleInspector>['footer']>> = {}, moduleInfo: ModuleInfo = info) {
  const footer = {
    signoffIncluded: true, onSignoff: vi.fn(), social: true, onSocial: vi.fn(),
    signature: { options: [{ id: 'ninety', label: 'Ninety One (Corporate)' }, { id: 'kevin', label: 'Kevin Kong - Japan' }], selectedId: 'ninety', preview: 'Kind regards, Ninety One', onSelect: vi.fn() },
    ...over,
  }
  render(
    <ModuleInspector module={mod} info={moduleInfo} headerTypes={[]} headerTypeId="" onRegion={vi.fn()} onRepeat={vi.fn()} onImage={vi.fn()}
      onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} footer={footer} />,
  )
  return footer
}

describe('ModuleInspector footer', () => {
  it('shows the footer as a sign-off, a signature and a tail', () => {
    setup()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Sign-off', 'Signature', 'Footer tail'])
    expect(within(screen.getByRole('region', { name: 'Sign-off' })).getByLabelText('Message line')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Footer tail' })).getByLabelText('Visit website link')).toBeTruthy()
  })

  it('the sign-off can be taken out, and its text goes with it', () => {
    const footer = setup({ signoffIncluded: false })
    expect(screen.queryByLabelText('Message line')).toBeNull()
    fireEvent.click(screen.getByLabelText('Include sign-off text'))
    expect(footer.onSignoff).toHaveBeenCalledWith(true)
  })

  it('the signature is chosen from the saved ones, with none or the module\'s own as alternatives', () => {
    const footer = setup()
    const select = screen.getByRole('combobox', { name: 'Signature' }) as HTMLSelectElement
    expect(select.value).toBe('ninety')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Ninety One (Corporate)', 'Kevin Kong - Japan', 'No signature', "The module's own signature"])
    fireEvent.change(select, { target: { value: 'kevin' } })
    expect(footer.signature.onSelect).toHaveBeenCalledWith('kevin')
  })

  it('a saved signature replaces the module\'s own signature fields, which return with "the module\'s own"', () => {
    setup()
    expect(screen.queryByLabelText('Kind regards line')).toBeNull()
    expect(screen.getByText('Kind regards, Ninety One')).toBeTruthy()
    cleanup()
    setup({ signature: { options: [], selectedId: 'module', preview: '', onSelect: vi.fn() } })
    expect(screen.getByLabelText('Kind regards line')).toBeTruthy()
  })

  it('the social icons are switched on or off', () => {
    const footer = setup({ social: false })
    const box = screen.getByLabelText('Show social icons') as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(footer.onSocial).toHaveBeenCalledWith(true)
  })

  it('a footer with no sign-off or signature of its own offers only the tail', () => {
    setup({}, { ...info, fields: [field('root.2', 'Visit website link', 'tail')], footer: { hasSignoff: false, hasSignature: false, hasSocial: false } })
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Footer tail'])
  })
})
