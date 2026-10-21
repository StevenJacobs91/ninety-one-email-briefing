// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'
import { defaultCardFields, resolveBoardSettings } from '../../../lib/boardConfig'

const state = vi.hoisted(() => ({
  settings: { approvals: { enabled: true }, campaignPlanner: {} } as Record<string, unknown>,
  updateSettings: vi.fn(),
}))

vi.mock('../../../contexts/KanbanContext', () => ({ useKanban: () => ({ moveCard: vi.fn() }) }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ({ getApprovalStatusForBrief: () => 'none' }) }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

import { BoardCard } from '../BoardCard'
import { TabCampaignPlanner } from '../../settings/TabCampaignPlanner'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Q3 update', emailType: 'newsletter', theme: 'agulhas-coral', subjectLine: 'Hello',
  region: ['UK', 'EU'], channel: ['INTERMEDIARY'], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '',
  urgency: 'urgent', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: '',
  assignee: 'Priya Naidoo', submittedByName: 'Ayesha Khan', submittedByEmail: 'ayesha@ninetyone.com',
}

const only = (...ids: string[]) => {
  const all = defaultCardFields().order
  return { order: [...ids, ...all.filter((i) => !ids.includes(i))], hidden: all.filter((i) => !ids.includes(i)) }
}

beforeEach(() => {
  state.settings = { approvals: { enabled: true }, campaignPlanner: {} }
  state.updateSettings.mockClear()
})
afterEach(cleanup)

describe('BoardCard', () => {
  it('always shows the email name, and only the fields switched on', () => {
    const board = resolveBoardSettings({ cardFields: only('region') } as never)
    render(<BoardCard card={card} board={board} />)
    expect(screen.getByText('Q3 update')).toBeTruthy()
    expect(screen.getByText('UK · EU')).toBeTruthy()
    expect(screen.queryByText('Priya Naidoo')).toBeNull()
    expect(screen.queryByText('Ayesha Khan')).toBeNull()
    expect(screen.queryByText('Urgent')).toBeNull()
  })

  it('shows who submitted the brief when that field is on', () => {
    const board = resolveBoardSettings({ cardFields: only('submittedBy', 'assignee') } as never)
    render(<BoardCard card={card} board={board} />)
    expect(screen.getByText('Ayesha Khan')).toBeTruthy()
    expect(screen.getByText('Priya Naidoo')).toBeTruthy()
  })

  it('shows the fields in the configured order', () => {
    const board = resolveBoardSettings({ cardFields: only('channel', 'region') } as never)
    render(<BoardCard card={card} board={board} />)
    const channel = screen.getByText('INTERMEDIARY')
    const region = screen.getByText('UK · EU')
    expect(channel.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a compact card drops the field labels', () => {
    const fields = only('region')
    const { unmount } = render(<BoardCard card={card} board={resolveBoardSettings({ cardFields: fields, density: 'comfortable' } as never)} />)
    expect(screen.getByText('Region')).toBeTruthy()
    unmount()
    render(<BoardCard card={card} board={resolveBoardSettings({ cardFields: fields, density: 'compact' } as never)} />)
    expect(screen.queryByText('Region')).toBeNull()
  })

  it('flags an overdue send date only when that badge is on', () => {
    const overdue = { ...card, sendDate: '2020-01-01' }
    const { unmount } = render(<BoardCard card={overdue} board={resolveBoardSettings({ cardFields: only('sendStatus') } as never)} />)
    expect(screen.getByText('Overdue')).toBeTruthy()
    unmount()
    render(<BoardCard card={overdue} board={resolveBoardSettings({ cardFields: only('region') } as never)} />)
    expect(screen.queryByText('Overdue')).toBeNull()
  })

  it('shows the approval status when it is on and approvals are enabled', () => {
    const board = resolveBoardSettings({ cardFields: only('approvalStatus') } as never)
    render(<BoardCard card={card} board={board} approvalOverride="pending" />)
    expect(screen.getByText('Pending Review')).toBeTruthy()
  })

  it('draws a coloured edge only when asked', () => {
    const fields = only('region')
    const { container, unmount } = render(<BoardCard card={card} board={resolveBoardSettings({ cardFields: fields, accent: 'urgency' } as never)} />)
    expect((container.firstChild as HTMLElement).style.borderLeftWidth).toBe('4px')
    unmount()
    const none = render(<BoardCard card={card} board={resolveBoardSettings({ cardFields: fields, accent: 'none' } as never)} />)
    expect((none.container.firstChild as HTMLElement).style.borderLeftWidth).toBe('')
  })

  it('has no quick-move or view buttons in read-only mode', () => {
    render(<BoardCard card={card} board={resolveBoardSettings({} as never)} readOnly />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Campaign Board settings tab', () => {
  const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].campaignPlanner

  it('switches the board off', async () => {
    const user = userEvent.setup()
    render(<TabCampaignPlanner />)
    await user.click(screen.getByRole('switch', { name: 'Show the Campaign Board' }))
    expect(saved().enabled).toBe(false)
  })

  it('hides a card field and keeps it in the saved order', async () => {
    const user = userEvent.setup()
    render(<TabCampaignPlanner />)
    const list = screen.getByRole('list', { name: 'Task card fields' })
    await user.click(within(list).getByRole('switch', { name: 'Show Assignee' }))
    expect(saved().cardFields.hidden).toContain('assignee')
    expect(saved().cardFields.order).toContain('assignee')
  })

  it('moves a field up the card', async () => {
    const user = userEvent.setup()
    render(<TabCampaignPlanner />)
    const list = screen.getByRole('list', { name: 'Task card fields' })
    await user.click(within(list).getByRole('button', { name: 'Move Emailtype up'.replace('Emailtype', 'Email type') }))
    const order: string[] = saved().cardFields.order
    expect(order.indexOf('emailType')).toBeLessThan(order.indexOf('urgency'))
  })

  it('does not let the last view be switched off', () => {
    state.settings = { approvals: { enabled: true }, campaignPlanner: { enabledViews: ['list'] } }
    render(<TabCampaignPlanner />)
    expect((screen.getByRole('checkbox', { name: 'List' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('shows a second field list only when the List has its own columns', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TabCampaignPlanner />)
    expect(screen.queryByRole('list', { name: 'List columns' })).toBeNull()
    await user.click(screen.getByRole('switch', { name: 'Choose different columns for the List' }))
    expect(saved().separateListFields).toBe(true)
    state.settings = { approvals: { enabled: true }, campaignPlanner: { separateListFields: true } }
    rerender(<TabCampaignPlanner />)
    expect(screen.getByRole('list', { name: 'List columns' })).toBeTruthy()
  })

  it('previews the card using the chosen fields', () => {
    state.settings = { approvals: { enabled: true }, campaignPlanner: { cardFields: only('assignee') } }
    render(<TabCampaignPlanner />)
    expect(screen.getAllByText('Priya Naidoo').length).toBeGreaterThan(0)
  })
})
