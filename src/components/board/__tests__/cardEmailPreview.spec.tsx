// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CardEmail } from '../useCardEmail'

vi.mock('../../builder2/ModulePreview', () => ({
  ModulePreview: ({ html, title }: { html: string; title: string }) => <div data-testid="email-frame" data-title={title}>{html}</div>,
}))

import { CardEmailPreview } from '../CardEmailPreview'

afterEach(cleanup)
const show = (email: CardEmail) => render(<CardEmailPreview email={email} title="Advisor Impact" />)

describe('CardEmailPreview', () => {
  it('shows the built email, titled with the email name', () => {
    show({ status: 'ready', html: '<html>THE EMAIL</html>' })
    expect(screen.getByTestId('email-frame').textContent).toBe('<html>THE EMAIL</html>')
    expect(screen.getByTestId('email-frame').getAttribute('data-title')).toBe('Advisor Impact')
  })

  it('says what is happening while it loads', () => {
    show({ status: 'loading' })
    expect(screen.getByText('Loading the email…')).toBeTruthy()
    cleanup()
    show({ status: 'loading-library' })
    expect(screen.getByText('Loading the module library…')).toBeTruthy()
  })

  it('says so when the card has no saved brief', () => {
    show({ status: 'missing' })
    expect(screen.getByText(/no saved email for this card/i)).toBeTruthy()
  })

  it('shows a load failure with its reason', () => {
    show({ status: 'error', message: 'Network down' })
    expect(screen.getByText('Network down')).toBeTruthy()
  })

  it('shows a library failure with a way to retry', async () => {
    const retry = vi.fn()
    const user = userEvent.setup()
    show({ status: 'library-error', message: 'No module library for this theme', retry })
    expect(screen.getByText('No module library for this theme')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('says when the email could not be built', () => {
    show({ status: 'unbuildable' })
    expect(screen.getByText(/could not be built/i)).toBeTruthy()
  })
})
