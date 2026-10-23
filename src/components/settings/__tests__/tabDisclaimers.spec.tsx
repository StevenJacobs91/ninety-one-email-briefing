// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { TabDisclaimers } from '../TabDisclaimers'

beforeEach(() => {
  state.settings = { legalDisclaimers: [{ id: 'za', label: 'South Africa — Standard', region: 'ZA', text: 'Line one\nLine two', isDefault: true }] }
  state.updateSettings.mockClear()
})
afterEach(cleanup)

const open = () => fireEvent.click(screen.getByRole('button', { name: /South Africa — Standard/ }))

describe('Disclaimers settings', () => {
  it('opens an older plain-text disclaimer in the rich editor, one line per line', () => {
    render(<TabDisclaimers />)
    open()
    expect(screen.getByRole('textbox', { name: 'Disclaimer text' }).innerHTML).toBe('Line one<br>Line two')
    expect(screen.getByRole('button', { name: 'Bold' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Text size' })).toBeTruthy()
  })

  it('saves the formatting, and the plain words alongside it', () => {
    render(<TabDisclaimers />)
    open()
    const editor = screen.getByRole('textbox', { name: 'Disclaimer text' })
    editor.innerHTML = '<p><b>Important</b> &amp; <span style="font-size: 12px">sized</span></p><p>Second</p>'
    fireEvent.input(editor)
    const saved = state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].legalDisclaimers[0]
    expect(saved.html).toBe('<p><b>Important</b> &amp; <span style="font-size: 12px">sized</span></p><p>Second</p>')
    expect(saved.text).toBe('Important & sized\n\nSecond')
  })
})
