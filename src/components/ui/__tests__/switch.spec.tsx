// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Switch } from '../Switch'

afterEach(cleanup)

const knob = () => screen.getByRole('switch').querySelector('span') as HTMLElement

describe('Switch', () => {
  it('is a switch with a name, and reports what it is set to', () => {
    render(<Switch checked label="Show Tags" onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Show Tags' })
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('moves the knob to the right when on and to the left when off', () => {
    const { rerender } = render(<Switch checked={false} label="x" onChange={() => {}} />)
    expect(knob().className).toContain('translate-x-0')
    expect(knob().className).not.toContain('translate-x-4')
    rerender(<Switch checked label="x" onChange={() => {}} />)
    expect(knob().className).toContain('translate-x-4')
  })

  it('uses only classes Tailwind generates, so the knob really moves', () => {
    for (const size of ['md', 'sm', 'xs'] as const) {
      render(<Switch checked label={size} size={size} onChange={() => {}} />)
      expect(screen.getByRole('switch', { name: size }).className + knob().className).not.toMatch(/\d\.5\]|4\.5/)
      cleanup()
    }
  })

  it('asks for the opposite when clicked', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} label="x" onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(true)
    cleanup()
    render(<Switch checked label="x" onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('does nothing when disabled', () => {
    const onChange = vi.fn()
    render(<Switch checked label="x" disabled onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('can show that it is on but needs setting up, in amber', () => {
    render(<Switch checked label="x" tone="warning" onChange={() => {}} />)
    expect(screen.getByRole('switch').className).toContain('bg-amber-400')
  })
})
