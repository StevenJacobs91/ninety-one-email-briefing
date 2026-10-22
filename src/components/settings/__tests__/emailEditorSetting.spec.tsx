// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { EmailEditorSetting } from '../EmailEditorSetting'

beforeEach(() => { state.settings = {}; state.updateSettings.mockClear() })
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].emailEditor
const choice = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement
const nameBox = () => screen.getByLabelText('Application name on your Mac') as HTMLInputElement

describe('Email editor setting', () => {
  it('offers Dreamweaver first, selected, with its application name', () => {
    render(<EmailEditorSetting />)
    const radios = screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)
    expect(radios).toEqual(['dreamweaver', 'vscode', 'other'])
    expect(choice('Adobe Dreamweaver').checked).toBe(true)
    expect(nameBox().value).toBe('Adobe Dreamweaver 2025')
  })

  it('choosing VS Code saves it with VS Code\'s application name', async () => {
    const user = userEvent.setup()
    render(<EmailEditorSetting />)
    await user.click(choice('VS Code'))
    expect(saved()).toEqual({ app: 'vscode', appName: 'Visual Studio Code' })
  })

  it('the application name can be changed for the version installed', () => {
    render(<EmailEditorSetting />)
    fireEvent.change(nameBox(), { target: { value: 'Adobe Dreamweaver 2024' } })
    expect(saved()).toEqual({ app: 'dreamweaver', appName: 'Adobe Dreamweaver 2024' })
  })

  it('another application is named by hand', async () => {
    const user = userEvent.setup()
    render(<EmailEditorSetting />)
    await user.click(choice('Another application'))
    expect(saved()).toEqual({ app: 'other', appName: '' })
    state.settings = { emailEditor: { app: 'other', appName: '' } }
    cleanup()
    render(<EmailEditorSetting />)
    expect(screen.getByText(/Type the name of the application/)).toBeTruthy()
    fireEvent.change(nameBox(), { target: { value: 'BBEdit' } })
    expect(saved()).toEqual({ app: 'other', appName: 'BBEdit' })
  })

  it('shows what the board\'s button will be called and an example of the command', () => {
    state.settings = { emailEditor: { app: 'vscode', appName: 'Visual Studio Code' } }
    render(<EmailEditorSetting />)
    expect(screen.getByText('Open in VS Code')).toBeTruthy()
    expect(screen.getByText(`open -a 'Visual Studio Code' ~/Downloads/'Your Email Name.html'`)).toBeTruthy()
  })

  it('says plainly that the browser downloads the file rather than launching the application', () => {
    render(<EmailEditorSetting />)
    expect(within(screen.getByRole('group', { name: 'Email editor' })).getByText(/downloads the HTML file/i)).toBeTruthy()
  })
})
