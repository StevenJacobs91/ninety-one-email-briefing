// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardEmail } from '../useCardEmail'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, download: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings }) }))
vi.mock('../../../lib/downloadHtml', () => ({ downloadHtml: state.download }))

import { OpenInEditor } from '../OpenInEditor'

const ready: CardEmail = { status: 'ready', html: '<html>THE EMAIL</html>' }

beforeEach(() => {
  state.settings = {}
  state.download.mockReset()
})
afterEach(cleanup)

const button = (name = /Open in/) => screen.getByRole('button', { name })

describe('OpenInEditor', () => {
  it('names the configured application, Dreamweaver unless another was chosen', () => {
    const { unmount } = render(<OpenInEditor email={ready} fileName="Advisor Impact.html" />)
    expect(button().textContent).toContain('Open in Dreamweaver')
    unmount()
    state.settings = { emailEditor: { app: 'vscode', appName: 'Visual Studio Code' } }
    render(<OpenInEditor email={ready} fileName="Advisor Impact.html" />)
    expect(button().textContent).toContain('Open in VS Code')
  })

  it('cannot be used until the email is ready', () => {
    const { unmount } = render(<OpenInEditor email={{ status: 'loading' }} fileName="a.html" />)
    expect((button() as HTMLButtonElement).disabled).toBe(true)
    unmount()
    render(<OpenInEditor email={ready} fileName="a.html" />)
    expect((button() as HTMLButtonElement).disabled).toBe(false)
  })

  it('downloads the email as an .html file named after it', async () => {
    const user = userEvent.setup()
    render(<OpenInEditor email={ready} fileName="Advisor Impact.html" />)
    await user.click(button())
    expect(state.download).toHaveBeenCalledWith('<html>THE EMAIL</html>', 'Advisor Impact.html')
  })

  it('then shows how to open it in the chosen application, as a command that can be copied', async () => {
    const user = userEvent.setup()
    render(<OpenInEditor email={ready} fileName="Advisor Impact.html" />)
    expect(screen.queryByRole('status')).toBeNull()
    await user.click(button())
    const hint = screen.getByRole('status')
    expect(hint.textContent).toContain('Advisor Impact.html')
    expect(hint.textContent).toContain('Dreamweaver')
    expect(screen.getByText(`open -a 'Adobe Dreamweaver 2025' ~/Downloads/'Advisor Impact.html'`)).toBeTruthy()
    // userEvent installs its own clipboard when it is set up, so watch that one.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    await user.click(screen.getByRole('button', { name: 'Copy command' }))
    expect(writeText).toHaveBeenCalledWith(`open -a 'Adobe Dreamweaver 2025' ~/Downloads/'Advisor Impact.html'`)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('uses the application name set in Settings in that command', async () => {
    const user = userEvent.setup()
    state.settings = { emailEditor: { app: 'other', appName: 'BBEdit' } }
    render(<OpenInEditor email={ready} fileName="a.html" />)
    expect(button().textContent).toContain('Open in BBEdit')
    await user.click(button())
    expect(screen.getByText(`open -a 'BBEdit' ~/Downloads/'a.html'`)).toBeTruthy()
  })

  it('the hint can be dismissed, and the button downloads again when used again', async () => {
    const user = userEvent.setup()
    render(<OpenInEditor email={ready} fileName="a.html" />)
    await user.click(button())
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).toBeNull()
    await user.click(button())
    expect(state.download).toHaveBeenCalledTimes(2)
  })
})
