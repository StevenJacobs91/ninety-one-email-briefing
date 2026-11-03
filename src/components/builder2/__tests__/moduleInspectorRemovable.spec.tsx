// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { assets: [] } }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { FieldInfo, ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const KEY = 'root.rm.button.0'
const base: BuildModule = { instanceId: 'a', moduleName: 'CTA module', slot: null, repeats: {}, regions: {}, images: {}, boundFields: {} }

const field = (key: string, label: string, rawKind: string, over: Partial<FieldInfo> = {}): FieldInfo => ({ key, rawKind, kind: 'text', value: label, label, name: label, locked: false, ...over })
const intro = field('root.0', 'Intro', 'paragraph')
const button = field('root.1', 'Button label', 'text', { removable: KEY })
const small = field('root.2', 'Small print', 'detail', { removable: KEY })

const info = (fields: FieldInfo[], removables: ModuleInfo['removables'] = [{ key: KEY, name: 'button', label: 'Button' }]): ModuleInfo => ({
  fields, boxes: [], repeats: [], images: [], imageKinds: [], removables,
})

function setup(i: ModuleInfo, module_: BuildModule = base) {
  const onRegion = vi.fn()
  render(
    <ModuleInspector module={module_} info={i} headerTypes={[]} headerTypeId="" onRegion={onRegion} onRepeat={vi.fn()}
      onImage={vi.fn()} onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} />,
  )
  return { onRegion }
}

describe('ModuleInspector removable sections', () => {
  it('puts the fields of a pardot-removable section together with its name and a small × on the right', () => {
    setup(info([intro, button, small]))
    const section = screen.getByRole('group', { name: 'Button' })
    expect(within(section).getByLabelText('Button label')).toBeTruthy()
    expect(within(section).getByLabelText('Small print')).toBeTruthy()
    expect(within(section).getByRole('button', { name: 'Remove Button' })).toBeTruthy()
    expect(within(section).queryByLabelText('Intro')).toBeNull()
  })

  it('has no × on fields that are not in a removable section', () => {
    setup(info([intro], []))
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
    expect(screen.getByLabelText('Intro')).toBeTruthy()
  })

  it('removes the section when its × is pressed', () => {
    const { onRegion } = setup(info([intro, button, small]))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Button' }))
    expect(onRegion).toHaveBeenCalledWith(KEY, { removed: true })
  })

  it('shows a removed section as removed, without its fields, and can put it back', () => {
    const { onRegion } = setup(info([intro, button, small]), { ...base, regions: { [KEY]: { removed: true } } })
    expect(screen.getByText('Button removed')).toBeTruthy()
    expect(screen.queryByLabelText('Button label')).toBeNull()
    expect(screen.getByLabelText('Intro')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Restore Button' }))
    expect(onRegion).toHaveBeenCalledWith(KEY, { removed: false })
  })

  it('gives a section that is a single field just the × beside it, with no heading of its own', () => {
    const only = field('root.0', 'Detail', 'detail', { removable: 'root.rm.detail.0' })
    setup(info([only], [{ key: 'root.rm.detail.0', name: 'detail', label: 'Detail' }]))
    expect(screen.getByLabelText('Detail')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove Detail' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Detail' })).toBeNull()
    expect(screen.queryAllByText('Detail')).toHaveLength(1)
  })

  it('offers a removable section that has no editable fields, so it can still be taken out', () => {
    const { onRegion } = setup(info([intro]))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Button' }))
    expect(onRegion).toHaveBeenCalledWith(KEY, { removed: true })
  })

  it('keeps a removable section inside the article it belongs to', () => {
    const unitKey = 'article[1].rm.note.0'
    const unitField = (i: number) => field(`article[${i}].0`, `Heading ${i + 1}`, 'heading', { name: 'Heading', unit: { group: 'article', index: i } })
    const noteField = field('article[1].1', 'Note', 'detail', { unit: { group: 'article', index: 1 }, removable: unitKey })
    const i: ModuleInfo = {
      fields: [unitField(0), unitField(1), noteField], boxes: [], images: [], imageKinds: [],
      repeats: [{ group: 'article', units: 2, canResize: true }],
      removables: [{ key: unitKey, name: 'note', label: 'Note', unit: { group: 'article', index: 1 } }],
    }
    const { onRegion } = setup(i)
    const second = screen.getByRole('region', { name: 'Article 2' })
    fireEvent.click(within(second).getByRole('button', { name: 'Remove Note' }))
    expect(onRegion).toHaveBeenCalledWith(unitKey, { removed: true })
    expect(within(screen.getByRole('region', { name: 'Article 1' })).queryByRole('button', { name: /^Remove / })).toBeNull()
  })
})
