// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabSignatures } from '../TabSignatures'

beforeEach(() => { state.settings = { signoffs: [] }; state.updateSettings.mockClear() })
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].signoffs

function openForm() {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Signature' }))
  fireEvent.change(screen.getByPlaceholderText(/Natalie Phillips – Deputy MD/), { target: { value: 'Two sides' } })
}

describe('Signatures: columns and code', () => {
  it('starts as one column of text, with a single box', () => {
    render(<TabSignatures />)
    openForm()
    expect(screen.getByRole('radio', { name: '1 column' })).toHaveProperty('checked', true)
    expect(screen.getByRole('radio', { name: 'Text' })).toHaveProperty('checked', true)
    expect(screen.getAllByRole('textbox', { name: /Signature text/ }).length).toBe(1)
  })

  it('a second column adds a second box, and both are saved with the layout', () => {
    render(<TabSignatures />)
    openForm()
    fireEvent.click(screen.getByRole('radio', { name: '2 columns' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Signature text, left column' }), { target: { value: '**Natalie Phillips**' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Signature text, right column' }), { target: { value: '[ninetyone.com](https://ninetyone.com)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Signature' }))
    expect(saved()[0]).toMatchObject({ name: 'Two sides', columns: 2, format: 'text', text: '**Natalie Phillips**', textRight: '[ninetyone.com](https://ninetyone.com)' })
  })

  it('code mode saves HTML as written', () => {
    render(<TabSignatures />)
    openForm()
    fireEvent.click(screen.getByRole('radio', { name: 'Code' }))
    fireEvent.change(screen.getByRole('textbox', { name: /Signature text/ }), { target: { value: '<strong>Natalie</strong> <a href="https://x.test">site</a>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Signature' }))
    expect(saved()[0]).toMatchObject({ columns: 1, format: 'code', text: '<strong>Natalie</strong> <a href="https://x.test">site</a>' })
  })

  it('the preview shows bold, links and both columns, and nothing that could run', () => {
    render(<TabSignatures />)
    openForm()
    fireEvent.click(screen.getByRole('radio', { name: '2 columns' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Code' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Signature text, left column' }), { target: { value: '<strong>Left</strong><script>bad()</script>' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Signature text, right column' }), { target: { value: '<a href="https://x.test">Right</a>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show preview' }))
    const preview = screen.getByTestId('signature-preview')
    expect(preview.querySelectorAll('td').length).toBe(2)
    expect(preview.querySelector('a')?.getAttribute('href')).toBe('https://x.test')
    expect(preview.innerHTML).not.toContain('<script')
    expect(preview.textContent).toContain('Left')
  })

  it('needs words in the left column to save, and the right can stay empty', () => {
    render(<TabSignatures />)
    openForm()
    fireEvent.click(screen.getByRole('radio', { name: '2 columns' }))
    const save = screen.getByRole('button', { name: 'Save Signature' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Signature text, left column' }), { target: { value: 'Kind regards' } })
    expect(save.disabled).toBe(false)
  })

  it('lists an older signature as before, and a two-column one with its tag and both sides', () => {
    state.settings = { signoffs: [
      { id: 'a', name: 'Old', text: 'Kind regards,\nNinety One', isDefault: true },
      { id: 'b', name: 'New', text: '**Natalie**', textRight: 'site', columns: 2, isDefault: false },
    ] }
    render(<TabSignatures />)
    expect(screen.getByText('Kind regards, Ninety One')).toBeTruthy()
    expect(screen.getByText('Natalie | site')).toBeTruthy()
    expect(screen.getByText('2 columns')).toBeTruthy()
  })

  it('editing a two-column signature opens it with both boxes filled', () => {
    state.settings = { signoffs: [{ id: 'b', name: 'New', text: 'Left words', textRight: 'Right words', columns: 2, isDefault: false }] }
    render(<TabSignatures />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect((screen.getByRole('textbox', { name: 'Signature text, left column' }) as HTMLTextAreaElement).value).toBe('Left words')
    expect((screen.getByRole('textbox', { name: 'Signature text, right column' }) as HTMLTextAreaElement).value).toBe('Right words')
  })
})
