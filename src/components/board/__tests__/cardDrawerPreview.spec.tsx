// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'

vi.mock('../../../lib/attachmentStorage', () => ({ openStoredAttachment: vi.fn() }))
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
vi.mock('../CardEmailPreview', () => ({
  CardEmailPreview: ({ briefId, emailName }: { briefId: string; emailName: string }) => <div data-testid="preview" data-brief={briefId} data-name={emailName} />,
}))

import { CardDetailDrawer } from '../CardDetailDrawer'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: [], channel: [], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '', urgency: 'standard', column: 'briefed',
  submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: '',
}

const screenIs = (wide: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: wide, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => screenIs(true))
afterEach(cleanup)

describe('card drawer email preview', () => {
  it('on a wide screen the details widen to sit beside the email', () => {
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    const side = screen.getByRole('complementary', { name: 'Email preview' })
    expect(within(side).getByTestId('preview').getAttribute('data-brief')).toBe('b1')
    expect(within(side).getByTestId('preview').getAttribute('data-name')).toBe('Advisor Impact')
    expect(screen.getAllByTestId('preview')).toHaveLength(1)
  })

  it('on a narrow screen the email sits inside the details instead, and is still built once', () => {
    screenIs(false)
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    expect(screen.queryByRole('complementary', { name: 'Email preview' })).toBeNull()
    const section = screen.getByRole('region', { name: 'Email preview' })
    expect(within(section).getByTestId('preview')).toBeTruthy()
    expect(screen.getAllByTestId('preview')).toHaveLength(1)
  })

  it('links to the full-size email in a new tab', () => {
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    const link = screen.getByRole('link', { name: /Open full size/ }) as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(`${window.location.origin}/?brief=b1&view=html`)
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
  })

  it('is still one dialog, so Escape-to-close and focus handling cover the email too', () => {
    render(<CardDetailDrawer card={card} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: /Brief detail: Advisor Impact/ })
    expect(within(dialog).getByRole('complementary', { name: 'Email preview' })).toBeTruthy()
  })
})
