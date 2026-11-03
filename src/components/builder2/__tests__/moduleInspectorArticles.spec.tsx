// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { assets: [] } }) }))

import type { BuildModule } from '../../../lib/moduleEngine/build'
import type { FieldInfo, ModuleInfo } from '../../../lib/moduleEngine/describe'
import { ModuleInspector } from '../ModuleInspector'

afterEach(cleanup)

const module_: BuildModule = { instanceId: 'a', moduleName: 'Investment Views Article List', slot: null, repeats: {}, regions: {}, images: {}, boundFields: {} }

// One article's fields, as describeModule reads them: media first, then category, heading, blurb, and the link.
const articleFields = (i: number): FieldInfo[] => [
  { key: `article[${i}].a0`, rawKind: 'editable-image', kind: 'image', value: 'https://placehold.co/133x240/333/e8e5ce.jpg', alt: 'Thumbnail', label: `Item ${i + 1} — Media`, name: 'Media', unit: { group: 'article', index: i }, locked: false },
  { key: `article[${i}].0`, rawKind: 'category', kind: 'text', value: `Category ${i + 1}`, label: `Item ${i + 1} — Category title`, name: 'Category title', unit: { group: 'article', index: i }, locked: false },
  { key: `article[${i}].1`, rawKind: 'heading', kind: 'text', value: `Heading ${i + 1}`, label: `Item ${i + 1} — Heading`, name: 'Heading', unit: { group: 'article', index: i }, locked: false },
  { key: `article[${i}].2`, rawKind: 'blurb', kind: 'text', value: `Blurb ${i + 1}`, label: `Item ${i + 1} — Blurb`, name: 'Blurb', unit: { group: 'article', index: i }, locked: false },
  { key: `article[${i}].a1`, rawKind: 'text', kind: 'text', value: 'Read more', href: `https://x/${i + 1}`, label: `Item ${i + 1} — Link title`, name: 'Link title', unit: { group: 'article', index: i }, locked: false },
]

const info: ModuleInfo = {
  fields: [...articleFields(0), ...articleFields(1)],
  boxes: [],
  repeats: [{ group: 'article', units: 2, canResize: true }],
  images: ['https://placehold.co/133x240/333/e8e5ce.jpg', 'https://placehold.co/133x170/333/e8e5ce.jpg'],
  imageKinds: ['placeholder', 'placeholder'],
  imageInUnit: [true, true],
}

function setup(over: Partial<React.ComponentProps<typeof ModuleInspector>> = {}) {
  const props = { onRegion: vi.fn(), onRepeat: vi.fn(), onImage: vi.fn() }
  render(
    <ModuleInspector module={module_} info={info} headerTypes={[]} headerTypeId="" onRegion={props.onRegion} onRepeat={props.onRepeat}
      onImage={props.onImage} onStyle={vi.fn()} onClearStyle={vi.fn()} onHeaderType={vi.fn()} onClose={vi.fn()} {...over} />,
  )
  return props
}

const labelsIn = (section: HTMLElement) => Array.from(section.querySelectorAll('label')).map((l) => l.textContent?.trim())

describe('ModuleInspector with repeating articles', () => {
  it('lists each article in turn: media, category title, heading, blurb, link title and link URL', () => {
    setup()
    const first = screen.getByRole('region', { name: 'Article 1' })
    const second = screen.getByRole('region', { name: 'Article 2' })
    const order = ['Media URL', 'Media alt text', 'Category title', 'Heading', 'Blurb', 'Link title', 'Link URL']
    expect(labelsIn(first)).toEqual(order)
    expect(labelsIn(second)).toEqual(order)
    // Article 1 comes before Article 2 on the page
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('edits one article without touching the other', () => {
    const { onRegion } = setup()
    const heading = within(screen.getByRole('region', { name: 'Article 2' })).getByLabelText('Heading')
    fireEvent.change(heading, { target: { value: 'A new heading' } })
    expect(onRegion).toHaveBeenCalledWith('article[1].1', { value: 'A new heading' })
  })

  it('adds and removes articles with the article count', () => {
    const { onRepeat } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add an item' }))
    expect(onRepeat).toHaveBeenCalledWith('article', 3)
    fireEvent.click(screen.getByRole('button', { name: 'Remove an item' }))
    expect(onRepeat).toHaveBeenCalledWith('article', 1)
    expect(screen.getByText('Articles')).toBeTruthy()
  })

  it('has no separate Media tab for pictures that belong to an article', () => {
    setup()
    expect(screen.queryByRole('tab', { name: 'Media' })).toBeNull()
  })
})
