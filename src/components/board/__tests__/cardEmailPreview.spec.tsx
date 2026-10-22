// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BriefPayload } from '../../../types/brief.types'

const m = vi.hoisted(() => ({
  fetchBriefById: vi.fn(),
  generateEmailHtml: vi.fn(),
  useCatalogue: vi.fn(),
}))

vi.mock('../../../lib/supabaseQueries', () => ({ fetchBriefById: m.fetchBriefById }))
vi.mock('../../../lib/emailGenerator', () => ({ generateEmailHtml: m.generateEmailHtml }))
vi.mock('../../builder2/useCatalogue', () => ({ useCatalogue: m.useCatalogue }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { marker: 'settings' } }) }))
vi.mock('../../builder2/ModulePreview', () => ({
  ModulePreview: ({ html, title }: { html: string; title: string }) => <div data-testid="email-frame" data-title={title}>{html}</div>,
}))

import { CardEmailPreview } from '../CardEmailPreview'

const brief = (over: Partial<BriefPayload['content']> = {}): BriefPayload => ({
  meta: { briefId: 'b1' },
  campaign: { theme: 'agulhas-gold', campaignName: 'Advisor Impact' },
  content: { ...over },
} as unknown as BriefPayload)

const CATALOGUE = { themeId: 'agulhas-gold', shell: { head: '', tail: '' }, order: [], modules: {} }

beforeEach(() => {
  m.fetchBriefById.mockReset()
  m.generateEmailHtml.mockReset().mockReturnValue('<html>THE EMAIL</html>')
  m.useCatalogue.mockReset().mockReturnValue({ status: 'ready', catalogue: CATALOGUE, retry: vi.fn() })
})
afterEach(cleanup)

describe('CardEmailPreview', () => {
  it('loads the card\'s brief and shows the email built from it', async () => {
    m.fetchBriefById.mockResolvedValue(brief({ build: { version: 1, themeId: 'agulhas-gold', modules: [] } }))
    render(<CardEmailPreview briefId="b1" emailName="Advisor Impact" />)
    expect(screen.getByText('Loading the email…')).toBeTruthy()
    expect((await screen.findByTestId('email-frame')).textContent).toBe('<html>THE EMAIL</html>')
    expect(m.fetchBriefById).toHaveBeenCalledWith('b1')
    expect(m.generateEmailHtml).toHaveBeenCalledWith(expect.objectContaining({ meta: { briefId: 'b1' } }), { marker: 'settings' }, { catalogue: CATALOGUE })
    expect(screen.getByTestId('email-frame').getAttribute('data-title')).toBe('Advisor Impact')
  })

  it('says so when the card has no saved brief to build an email from', async () => {
    m.fetchBriefById.mockResolvedValue(null)
    render(<CardEmailPreview briefId="manual" emailName="By hand" />)
    expect(await screen.findByText(/no saved email for this card/i)).toBeTruthy()
    expect(m.generateEmailHtml).not.toHaveBeenCalled()
  })

  it('reports a failure to load the brief', async () => {
    m.fetchBriefById.mockRejectedValue(new Error('Network down'))
    render(<CardEmailPreview briefId="b1" emailName="x" />)
    expect(await screen.findByText('Network down')).toBeTruthy()
  })

  it('waits for the theme\'s module library when the email was built from one', async () => {
    m.fetchBriefById.mockResolvedValue(brief({ build: { version: 1, themeId: 'agulhas-gold', modules: [] } }))
    m.useCatalogue.mockReturnValue({ status: 'loading', retry: vi.fn() })
    render(<CardEmailPreview briefId="b1" emailName="x" />)
    expect(await screen.findByText('Loading the module library…')).toBeTruthy()
    expect(m.generateEmailHtml).not.toHaveBeenCalled()
    expect(m.useCatalogue).toHaveBeenCalledWith('agulhas-gold')
  })

  it('shows the library error with a way to retry', async () => {
    const retry = vi.fn()
    const user = userEvent.setup()
    m.fetchBriefById.mockResolvedValue(brief({ build: { version: 1, themeId: 'agulhas-gold', modules: [] } }))
    m.useCatalogue.mockReturnValue({ status: 'error', message: 'No module library for this theme', retry })
    render(<CardEmailPreview briefId="b1" emailName="x" />)
    expect(await screen.findByText('No module library for this theme')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('does not fetch a module library for an older brief that has none', async () => {
    m.fetchBriefById.mockResolvedValue(brief())
    render(<CardEmailPreview briefId="b1" emailName="x" />)
    await waitFor(() => expect(screen.getByTestId('email-frame')).toBeTruthy())
    expect(m.useCatalogue).not.toHaveBeenCalled()
    expect(m.generateEmailHtml).toHaveBeenCalledWith(expect.anything(), expect.anything(), { catalogue: undefined })
  })

  it('says so, instead of breaking the drawer, when the email cannot be built', async () => {
    m.fetchBriefById.mockResolvedValue(brief())
    m.generateEmailHtml.mockImplementation(() => { throw new Error('bad module') })
    render(<CardEmailPreview briefId="b1" emailName="x" />)
    expect(await screen.findByText(/could not be built/i)).toBeTruthy()
  })

  it('loads a different card\'s email when the card changes', async () => {
    m.fetchBriefById.mockResolvedValue(brief())
    const { rerender } = render(<CardEmailPreview briefId="b1" emailName="x" />)
    await screen.findByTestId('email-frame')
    rerender(<CardEmailPreview briefId="b2" emailName="y" />)
    await waitFor(() => expect(m.fetchBriefById).toHaveBeenCalledWith('b2'))
  })
})
