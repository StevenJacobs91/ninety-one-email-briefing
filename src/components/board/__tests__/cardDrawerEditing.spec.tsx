// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'

const kanban = vi.hoisted(() => ({
  updateCardMeta: vi.fn(), updateCardDetails: vi.fn(), loadActivity: vi.fn(),
}))
const auth = vi.hoisted(() => ({ role: 'producer' }))
const email = vi.hoisted(() => ({ useCardEmail: vi.fn() }))

vi.mock('../../../lib/attachmentStorage', () => ({ openStoredAttachment: vi.fn() }))
vi.mock('../../../contexts/KanbanContext', () => ({
  useKanban: () => ({ moveCard: vi.fn(), updateCardNotes: vi.fn(), updateCardMeta: kanban.updateCardMeta, updateCardDetails: kanban.updateCardDetails, loadActivity: kanban.loadActivity, addComment: vi.fn(), removeCard: vi.fn() }),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ profile: { displayName: 'Sam', role: auth.role }, user: { id: 'u1', email: 's@x.test' } }) }))
vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { approvals: { enabled: false }, brandThemes: [{ id: 'agulhas-gold', label: 'Agulhas Indigo / Gazania Gold', primary: '#221b3b', accent: '#cf6f13' }] } }),
}))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ({ approvals: [] }) }))
vi.mock('../../approvals/ApprovalStatusBadge', () => ({ ApprovalStatusBadge: () => null }))
vi.mock('../../approvals/CardApprovalSection', () => ({ CardApprovalSection: () => null }))
vi.mock('../../builder2/useAvailableThemes', () => ({ useAvailableThemes: () => ({ ids: null, approximate: [] }) }))
vi.mock('../useProducers', () => ({ useProducers: (enabled: boolean) => (enabled ? ['Amy Adams', 'Steven Jacobs'] : []) }))
vi.mock('../useCardEmail', () => ({ useCardEmail: email.useCardEmail }))
vi.mock('../CardEmailPreview', () => ({ CardEmailPreview: () => null }))

import { CardDetailDrawer } from '../CardDetailDrawer'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: ['Southern Africa'], sendDate: '2030-01-01', contentApprovalDate: '',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [{ column: 'briefed', at: '2026-10-20T08:00:00Z' }], notes: '', tags: 'a, b',
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  })) as unknown as typeof window.matchMedia
  auth.role = 'producer'
  kanban.updateCardMeta.mockReset()
  kanban.updateCardDetails.mockReset().mockResolvedValue({ ok: true })
  kanban.loadActivity.mockReset().mockResolvedValue(undefined)
  email.useCardEmail.mockReset().mockReturnValue({ status: 'loading' })
})
afterEach(cleanup)

describe('the card drawer, for someone who can edit', () => {
  it('picks the assignee from the producers, and keeps an assignee who is no longer one', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CardDetailDrawer card={card} onClose={() => {}} />)
    const select = screen.getByLabelText('Assignee') as HTMLSelectElement
    expect([...select.options].map((o) => o.textContent)).toEqual(['Unassigned', 'Amy Adams', 'Steven Jacobs'])
    await user.selectOptions(select, 'Amy Adams')
    expect(kanban.updateCardMeta).toHaveBeenLastCalledWith('c1', expect.objectContaining({ assignee: 'Amy Adams' }))
    await user.selectOptions(select, 'Unassigned')
    expect(kanban.updateCardMeta).toHaveBeenLastCalledWith('c1', expect.objectContaining({ assignee: '' }))

    rerender(<CardDetailDrawer card={{ ...card, assignee: 'Former Colleague' }} onClose={() => {}} />)
    const again = screen.getByLabelText('Assignee') as HTMLSelectElement
    expect([...again.options].map((o) => o.textContent)).toContain('Former Colleague')
    expect(again.value).toBe('Former Colleague')
  })

  it('fills Production start with the day the card first moved to In Progress, and keeps a date that is set', () => {
    const moved = { ...card, column: 'in-progress' as const, columnHistory: [
      { column: 'briefed' as const, at: '2026-10-20T12:00:00Z' },
      { column: 'in-progress' as const, at: '2026-10-22T12:00:00Z' },
    ] }
    const { rerender } = render(<CardDetailDrawer card={moved} onClose={() => {}} />)
    expect((screen.getByLabelText('Production start') as HTMLInputElement).value).toBe('2026-10-22')
    rerender(<CardDetailDrawer card={{ ...moved, startDate: '2026-10-25' }} onClose={() => {}} />)
    expect((screen.getByLabelText('Production start') as HTMLInputElement).value).toBe('2026-10-25')
  })

  it('leaves Production start empty on a card that has not reached In Progress', () => {
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    expect((screen.getByLabelText('Production start') as HTMLInputElement).value).toBe('')
  })

  it('saves an edit through the board, and rebuilds the email from the saved brief', async () => {
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    expect(email.useCardEmail).toHaveBeenLastCalledWith('b1', 0)
    const input = screen.getByLabelText('Subject line')
    fireEvent.change(input, { target: { value: 'A better subject' } })
    fireEvent.blur(input)
    await waitFor(() => expect(kanban.updateCardDetails).toHaveBeenCalledWith('c1', { subjectLine: 'A better subject' }))
    await waitFor(() => expect(email.useCardEmail).toHaveBeenLastCalledWith('b1', 1))
  })

  it('does not rebuild the email when the change was refused', async () => {
    kanban.updateCardDetails.mockResolvedValue({ ok: false, error: 'The subject line cannot be empty.' })
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    const input = screen.getByLabelText('Subject line')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect((await screen.findByRole('alert')).textContent).toContain('cannot be empty')
    expect(email.useCardEmail).not.toHaveBeenCalledWith('b1', 1)
  })
})

describe('the card drawer\'s history', () => {
  it('reads the card\'s recorded changes when it opens, and shows them with the moves', () => {
    const edited = { ...card, activity: [{ id: 'a1', at: '2026-10-21T12:00:00Z', by: 'Amy', field: 'subjectLine', label: 'Subject line', from: 'Hello', to: 'New' }] }
    render(<CardDetailDrawer card={edited} onClose={() => {}} />)
    expect(kanban.loadActivity).toHaveBeenCalledWith('c1')
    const history = screen.getByText('History').closest('section') as HTMLElement
    expect(history.textContent).toContain('Added to Briefed')
    expect(history.textContent).toContain('Subject line changed')
    expect(history.textContent).toContain('Hello → New')
    expect(history.textContent).toContain('Amy')
  })
})

describe('the card drawer, for someone who cannot edit', () => {
  it('shows the fields without edit controls, and the assignee as a disabled box', () => {
    auth.role = 'requester'
    render(<CardDetailDrawer card={{ ...card, assignee: 'Amy Adams' }} onClose={() => {}} />)
    expect(screen.queryByLabelText('Subject line')).toBeNull()
    expect(screen.getByText('Hello')).toBeTruthy()
    const select = screen.getByLabelText('Assignee') as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect([...select.options].map((o) => o.textContent)).toEqual(['Unassigned', 'Amy Adams'])
    expect(screen.getByRole('button', { name: 'Copy tags' })).toBeTruthy()
  })
})
