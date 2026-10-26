// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../types/kanban.types'

const queries = vi.hoisted(() => ({
  fetchKanbanCards: vi.fn(), insertKanbanCard: vi.fn(), updateKanbanCard: vi.fn(), deleteKanbanCard: vi.fn(),
}))
vi.mock('../supabaseQueries', () => queries)
const approvals = vi.hoisted(() => ({ distributeWithOverride: vi.fn() }))
vi.mock('../approvalsService', () => approvals)
const notify = vi.hoisted(() => ({ triggerNotification: vi.fn() }))
vi.mock('../notificationService', () => notify)
const audit = vi.hoisted(() => ({ writeAuditLog: vi.fn() }))
vi.mock('../auditLog', () => audit)
const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { audit: {}, notifications: { enabled: true } } }) }))

import { KanbanProvider, useKanban } from '../../contexts/KanbanContext'

const card = (extra: Partial<KanbanCard> = {}): KanbanCard => ({
  id: 'c1', briefId: 'b1', emailName: 'Taking Stock', emailType: 'newsletter', theme: 'agulhas-gold', subjectLine: 'S',
  region: [], channel: [], clientGroup: [], sendDate: '2026-11-01', contentApprovalDate: '2026-10-28', urgency: 'standard',
  column: 'in-progress', submittedAt: '2026-10-20T10:00:00Z', columnHistory: [{ column: 'in-progress', at: '2026-10-20T10:00:00Z' }],
  notes: '', tags: '', submittedByName: 'Paula', submittedByEmail: 'paula@ninetyone.com', ...extra,
})

function Board() {
  const { cards, moveCard } = useKanban()
  return (
    <div>
      {cards.map((c) => (
        <p key={c.id} data-testid="card">{c.emailName}: {c.column} ({c.columnHistory.length}{c.columnHistory.some((h) => h.override) ? ', override' : ''})</p>
      ))}
      <button onClick={() => moveCard('c1', 'distributed')}>Distribute</button>
      <button onClick={() => moveCard('c1', 'briefed')}>Back to briefed</button>
    </div>
  )
}

async function mount(role = 'producer') {
  auth.value = { profile: { id: 'u1', teamId: 't', displayName: 'Paula', role }, user: { id: 'u1', email: 'p@x.com' } }
  queries.fetchKanbanCards.mockResolvedValue([card()])
  render(<KanbanProvider><Board /></KanbanProvider>)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
}

const click = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }
const text = () => screen.getByTestId('card').textContent
const events = () => notify.triggerNotification.mock.calls.map((c) => c[0] as string)

beforeEach(() => {
  Object.values(queries).forEach((fn) => fn.mockReset())
  queries.updateKanbanCard.mockResolvedValue(undefined)
  approvals.distributeWithOverride.mockReset().mockResolvedValue(undefined)
  notify.triggerNotification.mockReset().mockResolvedValue({ success: true })
  audit.writeAuditLog.mockReset()
})
afterEach(cleanup)

describe('moving a card', () => {
  it('shows the move straight away and saves it', async () => {
    await mount()
    await click('Back to briefed')
    expect(text()).toContain('briefed')
    expect(queries.updateKanbanCard).toHaveBeenCalledWith('c1', expect.objectContaining({ column: 'briefed' }))
    expect(events()).toEqual(['kanban_moved'])
  })

  it('distributes a card the database allows, and tells the team once it has been saved', async () => {
    await mount()
    await click('Distribute')
    expect(text()).toContain('distributed')
    expect(events()).toEqual(['kanban_moved'])
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('a card the team requires approval for', () => {
  beforeEach(() => {
    queries.updateKanbanCard.mockRejectedValue(new Error('Failed to update kanban card: distribution_blocked:approval_pending'))
  })

  it('goes back where it was, and says why', async () => {
    await mount()
    await click('Distribute')
    expect(text()).toContain('in-progress (1)')
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.textContent).toMatch(/This brief is still waiting for approval/)
    expect(dialog.textContent).toMatch(/Taking Stock/)
  })

  it('does not tell the team it moved, or write it to the audit log as moved', async () => {
    await mount()
    await click('Distribute')
    expect(events()).toEqual([])
    expect(audit.writeAuditLog).not.toHaveBeenCalled()
  })

  it('can be closed, leaving the card where it was', async () => {
    await mount()
    await click('Distribute')
    await click('Close')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(text()).toContain('in-progress')
  })

  it('gives someone who is not an admin no way round it', async () => {
    await mount('producer')
    await click('Distribute')
    expect(screen.queryByRole('button', { name: 'Distribute anyway' })).toBeNull()
  })

  it('lets an admin distribute it anyway with a reason, which is recorded, and tells the team', async () => {
    await mount('admin')
    await click('Distribute')
    fireEvent.change(screen.getByLabelText(/Distribute anyway \(admins only\)/), { target: { value: 'Client confirmed by phone' } })
    await click('Distribute anyway')
    expect(approvals.distributeWithOverride).toHaveBeenCalledWith({ cardId: 'c1', reason: 'Client confirmed by phone' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(text()).toContain('distributed (2, override)')
    expect(events()).toEqual(expect.arrayContaining(['kanban_moved', 'approval_overridden']))
    const overridden = notify.triggerNotification.mock.calls.find((c) => c[0] === 'approval_overridden')![1]
    expect(overridden).toMatchObject({ overriddenBy: 'Paula', reason: 'Client confirmed by phone', toEmails: 'paula@ninetyone.com' })
    expect(audit.writeAuditLog).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ action: 'Distributed without the required approval' }))
  })

  it('keeps the dialog open, with the reason, when the override is refused', async () => {
    approvals.distributeWithOverride.mockRejectedValue(new Error('Only admins can do this.'))
    await mount('admin')
    await click('Distribute')
    fireEvent.change(screen.getByLabelText(/Distribute anyway \(admins only\)/), { target: { value: 'Client confirmed by phone' } })
    await click('Distribute anyway')
    expect(screen.getByRole('alert').textContent).toMatch(/Only admins/)
    expect(text()).toContain('in-progress')
  })
})

describe('a failure that is not about approval', () => {
  it('is logged and does not open the dialog', async () => {
    queries.updateKanbanCard.mockRejectedValue(new Error('connection reset'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await mount()
    await click('Distribute')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })
})
