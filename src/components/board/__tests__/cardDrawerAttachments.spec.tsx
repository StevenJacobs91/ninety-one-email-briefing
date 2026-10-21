// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'

const storage = vi.hoisted(() => ({ openStoredAttachment: vi.fn() }))

vi.mock('../../../lib/attachmentStorage', () => storage)
vi.mock('../../../contexts/KanbanContext', () => ({
  useKanban: () => ({ moveCard: vi.fn(), updateCardNotes: vi.fn(), updateCardMeta: vi.fn(), addComment: vi.fn(), removeCard: vi.fn() }),
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ profile: { displayName: 'Sam' }, user: { id: 'u1', email: 's@x.test' } }) }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { approvals: { enabled: false } } }) }))
vi.mock('../../../contexts/ApprovalsContext', () => ({
  useApprovals: () => ({ getApprovalStatusForBrief: () => 'none', getLatestApprovalForBrief: () => undefined, approvals: [] }),
}))
vi.mock('../../approvals/ApprovalStatusBadge', () => ({ ApprovalStatusBadge: () => null }))
vi.mock('../../approvals/ApprovalHistoryTimeline', () => ({ ApprovalHistoryTimeline: () => null }))
vi.mock('../../approvals/SubmitForApprovalModal', () => ({ SubmitForApprovalModal: () => null }))
vi.mock('../../../lib/approvalsService', () => ({ fetchBriefById: vi.fn() }))

import { CardDetailDrawer } from '../CardDetailDrawer'

const card = (over: Partial<KanbanCard> = {}): KanbanCard => ({
  id: 'c1', briefId: 'b1', emailName: 'Q3 update', emailType: 'newsletter', theme: 'agulhas-coral', subjectLine: 'Hello',
  region: [], channel: [], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '', urgency: 'standard', column: 'briefed',
  submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: '', ...over,
})

const FILES = [
  { name: 'campaign-brief.pdf', size: 245760, type: 'application/pdf', path: 't1/b1/ab-campaign-brief.pdf' },
  { name: 'hero.png', size: 1024, type: 'image/png', path: 't1/b1/cd-hero.png' },
]

beforeEach(() => {
  storage.openStoredAttachment.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('card drawer attachments', () => {
  it('lists the files attached to the brief with their sizes', () => {
    render(<CardDetailDrawer card={card({ attachments: FILES })} onClose={() => {}} />)
    const section = screen.getByRole('region', { name: 'Attachments' })
    expect(within(section).getByText('campaign-brief.pdf')).toBeTruthy()
    expect(within(section).getByText('240.0 KB')).toBeTruthy()
    expect(within(section).getByText('hero.png')).toBeTruthy()
  })

  it('opens a file for download when its name is clicked', async () => {
    const user = userEvent.setup()
    render(<CardDetailDrawer card={card({ attachments: FILES })} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Download campaign-brief.pdf' }))
    expect(storage.openStoredAttachment).toHaveBeenCalledWith('t1/b1/ab-campaign-brief.pdf', 'campaign-brief.pdf')
  })

  it('says so when a file cannot be opened', async () => {
    const user = userEvent.setup()
    storage.openStoredAttachment.mockRejectedValue(new Error('Object not found'))
    render(<CardDetailDrawer card={card({ attachments: FILES })} onClose={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Download hero.png' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/hero\.png.*could not be opened/i))
  })

  it('has no attachments section when there are none', () => {
    render(<CardDetailDrawer card={card()} onClose={() => {}} />)
    expect(screen.queryByRole('region', { name: 'Attachments' })).toBeNull()
  })
})
