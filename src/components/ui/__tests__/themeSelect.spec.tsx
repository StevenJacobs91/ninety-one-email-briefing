// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ThemeSelect, type ThemeOption } from '../ThemeSelect'

afterEach(cleanup)

const OPTIONS: ThemeOption[] = [
  { id: 'coral', label: 'Leatherback Green / Cape Coral', primary: '#134848', accent: '#fbaa96' },
  { id: 'gold', label: 'Marula Green / Gazania Gold', primary: '#0a3323', accent: '#cf6f13', note: 'Approximate module library' },
  { id: 'pending', label: 'White / Ocean Teal', primary: '#ffffff', accent: '#009d80', disabled: true, note: 'Module library pending' },
]

function Harness({ initial = 'coral', onChange }: { initial?: string; onChange?: (id: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label id="lbl" htmlFor="theme">Brand Theme</label>
      <ThemeSelect id="theme" name="campaign.theme" labelledBy="lbl" value={value} options={OPTIONS} onChange={(id) => { setValue(id); onChange?.(id) }} />
    </>
  )
}

const button = () => screen.getByRole('combobox', { name: /Brand Theme/ })
const swatches = (el: Element) => Array.from(el.querySelectorAll<HTMLElement>('[data-swatch]')).map((s) => s.style.backgroundColor)

describe('ThemeSelect', () => {
  it('shows the chosen theme with its two colours inside the control', () => {
    render(<Harness />)
    expect(button().textContent).toContain('Leatherback Green / Cape Coral')
    expect(swatches(button())).toEqual(['rgb(19, 72, 72)', 'rgb(251, 170, 150)'])
    expect(button().getAttribute('aria-expanded')).toBe('false')
  })

  it('opens a list where every theme shows its own colours', () => {
    render(<Harness />)
    fireEvent.click(button())
    expect(button().getAttribute('aria-expanded')).toBe('true')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(swatches(options[1])).toEqual(['rgb(10, 51, 35)', 'rgb(207, 111, 19)'])
    expect(options[0].getAttribute('aria-selected')).toBe('true')
  })

  it('choosing a theme selects it and closes the list', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(button())
    fireEvent.click(screen.getByRole('option', { name: /Marula Green/ }))
    expect(onChange).toHaveBeenCalledWith('gold')
    expect(button().textContent).toContain('Marula Green / Gazania Gold')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('a theme with no module library is shown but cannot be chosen, and says why', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.click(button())
    const pending = screen.getByRole('option', { name: /White \/ Ocean Teal/ })
    expect(pending.getAttribute('aria-disabled')).toBe('true')
    expect(pending.textContent).toContain('Module library pending')
    fireEvent.click(pending)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('works from the keyboard: arrows move, Enter chooses, Escape closes', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.keyDown(button(), { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(button(), { key: 'ArrowDown' })
    fireEvent.keyDown(button(), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('gold')
    fireEvent.keyDown(button(), { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.keyDown(button(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(button())
  })

  it('skips a theme that cannot be chosen when moving with the arrows', () => {
    const onChange = vi.fn()
    render(<Harness initial="gold" onChange={onChange} />)
    fireEvent.keyDown(button(), { key: 'ArrowDown' })
    fireEvent.keyDown(button(), { key: 'ArrowDown' })
    fireEvent.keyDown(button(), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalledWith('pending')
  })

  it('closes when clicking elsewhere', () => {
    render(<Harness />)
    fireEvent.click(button())
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('can be found by its field name, for jumping to it from a problem', () => {
    render(<Harness />)
    expect(document.querySelector('[name="campaign.theme"]')).toBe(button())
  })
})
