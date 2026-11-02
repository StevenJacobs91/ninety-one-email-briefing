// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ButtonWidthEditor } from '../ButtonWidthEditor'

afterEach(cleanup)

const optionTexts = (select: HTMLElement) => Array.from(select.querySelectorAll('option')).map((o) => o.textContent)

describe('the button width control', () => {
  it('is not shown for a module with no buttons, or with three in a row', () => {
    const { container, rerender } = render(<ButtonWidthEditor rows={[]} widths={undefined} onChange={() => {}} />)
    expect(container.textContent).toBe('')
    rerender(<ButtonWidthEditor rows={[3]} widths={undefined} onChange={() => {}} />)
    expect(container.textContent).toBe('')
  })

  it('offers a single button its widths, starting from the design', () => {
    render(<ButtonWidthEditor rows={[1]} widths={undefined} onChange={() => {}} />)
    const select = screen.getByLabelText('Width')
    expect((select as HTMLSelectElement).value).toBe('')
    const texts = optionTexts(select)
    expect(texts[0]).toMatch(/as designed/i)
    expect(texts).toEqual(expect.arrayContaining(['30%', '50%', '70%', '100%']))
  })

  it('offers two buttons their splits, such as 30% / 70%', () => {
    render(<ButtonWidthEditor rows={[2]} widths={undefined} onChange={() => {}} />)
    const texts = optionTexts(screen.getByLabelText('Split'))
    expect(texts[0]).toMatch(/as designed/i)
    expect(texts).toEqual(expect.arrayContaining(['50% / 50%', '30% / 70%', '40% / 60%', '60% / 40%', '70% / 30%']))
  })

  it('reports a single width as one number', () => {
    const onChange = vi.fn()
    render(<ButtonWidthEditor rows={[1]} widths={undefined} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '70' } })
    expect(onChange).toHaveBeenCalledWith(0, [70])
  })

  it('reports a split as the two shares', () => {
    const onChange = vi.fn()
    render(<ButtonWidthEditor rows={[2]} widths={undefined} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Split'), { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledWith(0, [30, 70])
  })

  it('goes back to the design when "as designed" is chosen', () => {
    const onChange = vi.fn()
    render(<ButtonWidthEditor rows={[2]} widths={{ '0': [30, 70] }} onChange={onChange} />)
    expect((screen.getByLabelText('Split') as HTMLSelectElement).value).toBe('30')
    fireEvent.change(screen.getByLabelText('Split'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(0, undefined)
  })

  it('names each row when a module has several, and sets the right one', () => {
    const onChange = vi.fn()
    render(<ButtonWidthEditor rows={[1, 2]} widths={undefined} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Row 2 split'), { target: { value: '60' } })
    expect(onChange).toHaveBeenCalledWith(1, [60, 40])
    expect(screen.getByLabelText('Row 1 width')).toBeTruthy()
  })
})
