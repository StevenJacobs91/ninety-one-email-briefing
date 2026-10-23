// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabModules } from '../TabModules'

const ROW = '<tr><td bgcolor="{{primary}}">Hello</td></tr>'

beforeEach(() => {
  state.updateSettings.mockClear()
  state.settings = {
    brandThemes: [{ id: 'agulhas-gold', primary: '#221b3b', accent: '#cf6f13' }],
    htmlModules: [
      { id: 'speakers', label: 'Speakers', description: 'Speaker photos', category: 'Speakers', enabled: true },
      { id: 'promo', label: 'Promo Banner', description: 'A banner', category: 'Content', enabled: true, html: ROW },
    ],
  }
})
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].htmlModules
const code = () => screen.getByLabelText(/Module code/) as HTMLTextAreaElement

// The list is grouped by category, so find a module's Edit button by its name.
const editButton = (label: string) => screen.getByText(label, { selector: 'p' }).closest('.group')!.querySelector('button[title="Edit"]') as HTMLElement

function fillNew(html: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
  fireEvent.change(screen.getByPlaceholderText('my-custom-module'), { target: { value: 'new-one' } })
  fireEvent.change(screen.getByPlaceholderText('Module display name'), { target: { value: 'New One' } })
  fireEvent.change(code(), { target: { value: html } })
}

describe('Email Modules: module code', () => {
  it('has a code box when adding a module, with a hint about table rows, regions and theme colours', () => {
    render(<TabModules />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
    expect(code()).toBeTruthy()
    expect(screen.getByText(/pardot-region/)).toBeTruthy()
    expect(screen.getByText('{{primary}}')).toBeTruthy()
  })

  it('saves the code with a new module', () => {
    render(<TabModules />)
    fillNew(`\n  ${ROW}\n`)
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(saved().find((m: { id: string }) => m.id === 'new-one').html).toBe(ROW)
  })

  it('will not add a module with no code, or with code that is not a table row, and says why', () => {
    render(<TabModules />)
    fillNew('')
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toBe('Paste the module\'s HTML.')
    expect(state.updateSettings).not.toHaveBeenCalled()
    fireEvent.change(code(), { target: { value: '<p>Hi</p>' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toMatch(/start with <tr>/)
    fireEvent.change(code(), { target: { value: '<tr><td><script>x()</script></td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Scripts are not allowed/)
    expect(state.updateSettings).not.toHaveBeenCalled()
  })

  it('shows the code of a module that has some when editing, and saves a change to it', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    expect(code().value).toBe(ROW)
    fireEvent.change(code(), { target: { value: '<tr><td>Changed</td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(saved().find((m: { id: string }) => m.id === 'promo').html).toBe('<tr><td>Changed</td></tr>')
  })

  it('a built-in module opens with an empty code box that keeps the library\'s code, and can be given its own', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Speakers'))
    expect(code().value).toBe('')
    expect(screen.getByText(/currently uses the library/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect('html' in saved().find((m: { id: string }) => m.id === 'speakers')).toBe(false)
    fireEvent.click(editButton('Speakers'))
    fireEvent.change(code(), { target: { value: '<tr><td>Mine</td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(saved().find((m: { id: string }) => m.id === 'speakers').html).toBe('<tr><td>Mine</td></tr>')
  })

  it('clearing the code of a custom module on edit takes it out of the builder\'s library', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    fireEvent.change(code(), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect('html' in saved().find((m: { id: string }) => m.id === 'promo')).toBe(false)
  })

  it('previews the code in the theme\'s colours, in a sandbox that cannot run anything', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    fireEvent.click(screen.getByRole('button', { name: 'Show preview' }))
    const frame = screen.getByTitle('Module preview') as HTMLIFrameElement
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('bgcolor="#221b3b"')
  })
})
