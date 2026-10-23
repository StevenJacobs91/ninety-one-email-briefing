// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldInfo } from '../../../lib/moduleEngine/describe'
import { RegionEditor } from '../RegionEditor'

afterEach(cleanup)

const field = (value: string): FieldInfo => ({ key: 'root.0', rawKind: 'subheading', kind: 'text', value, label: 'Heading', locked: false })

describe('RegionEditor text over two lines', () => {
  it('uses a box with a line for each line when the design breaks the text', () => {
    render(<RegionEditor field={field('Global equity: Focus on stock\nselection in a broadening market')} saved={undefined} onChange={() => {}} />)
    const box = screen.getByLabelText('Heading') as HTMLTextAreaElement
    expect(box.tagName).toBe('TEXTAREA')
    expect(box.placeholder).toBe('Global equity: Focus on stock\nselection in a broadening market')
  })

  it('reports what is typed, line breaks included', () => {
    const onChange = vi.fn()
    render(<RegionEditor field={field('One\nTwo')} saved={undefined} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Heading'), { target: { value: 'New heading' } })
    expect(onChange).toHaveBeenCalledWith({ value: 'New heading' })
  })

  it('stays a single line box for text that is one line', () => {
    render(<RegionEditor field={field('Just one line')} saved={undefined} onChange={() => {}} />)
    expect((screen.getByLabelText('Heading') as HTMLElement).tagName).toBe('INPUT')
  })
})
