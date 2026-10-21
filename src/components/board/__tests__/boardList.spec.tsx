// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'
import { defaultCardFields } from '../../../lib/boardConfig'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, cards: [] as unknown[] }))

vi.mock('../../../contexts/KanbanContext', () => ({ useKanban: () => ({ cards: state.cards, moveCard: vi.fn() }) }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ({ getApprovalStatusForBrief: () => 'none' }) }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings }) }))
vi.mock('../CardDetailDrawer', () => ({
  CardDetailDrawer: ({ card }: { card: KanbanCard }) => <div role="dialog" aria-label="Brief detail">{`detail: ${card.emailName}`}</div>,
}))

import { BoardListView } from '../BoardListView'

const card = (over: Partial<KanbanCard>): KanbanCard => ({
  id: 'c1', briefId: 'b1', emailName: 'Important information', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: '',
  ...over,
})

const only = (...ids: string[]) => {
  const all = defaultCardFields().order
  return { order: [...ids, ...all.filter((i) => !ids.includes(i))], hidden: all.filter((i) => !ids.includes(i)) }
}
const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
const header = (name: string) => screen.getAllByRole('columnheader').find((h) => h.textContent?.trim() === name)!
const KEY = 'ni-board-list-columns'

beforeEach(() => {
  state.settings = { approvals: { enabled: false }, campaignPlanner: { cardFields: only('region', 'channel') } }
  state.cards = [card({}), card({ id: 'c2', briefId: 'b2', emailName: 'Advisor Impact' })]
  localStorage.clear()
})
afterEach(cleanup)

describe('BoardListView', () => {
  it('opens the detail card when the email name is clicked', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Advisor Impact' }))
    expect(within(screen.getByRole('dialog')).getByText('detail: Advisor Impact')).toBeTruthy()
  })

  it('can show how many files each brief has attached', () => {
    state.settings = { approvals: { enabled: false }, campaignPlanner: { cardFields: only('attachments') } }
    state.cards = [card({ attachments: [{ name: 'a.pdf', size: 1, type: 'application/pdf', path: 'p' }, { name: 'b.pdf', size: 1, type: 'application/pdf', path: 'q' }] }), card({ id: 'c2', briefId: 'b2', emailName: 'No files' })]
    render(<BoardListView />)
    expect(headers()).toEqual(['Email Name', 'Stage', 'Attachments', 'Actions'])
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getAllByRole('cell')[2].textContent?.trim()).toBe('2')
    expect(within(rows[2]).getAllByRole('cell')[2].textContent?.trim()).toBe('0')
  })

  it('is as wide as the Board and Calendar views, not held to a narrow column', () => {
    const { container } = render(<BoardListView />)
    expect(container.querySelector('.max-w-7xl')).toBeNull()
  })

  it('shows the configured columns between the name and the actions', () => {
    render(<BoardListView />)
    expect(headers()).toEqual(['Email Name', 'Stage', 'Region', 'Channel', 'Actions'])
  })

  it('moves a column to where another is dropped, by dragging its heading', () => {
    render(<BoardListView />)
    fireEvent.dragStart(header('Channel'))
    fireEvent.dragOver(header('Stage'))
    fireEvent.drop(header('Stage'))
    expect(headers()).toEqual(['Email Name', 'Channel', 'Stage', 'Region', 'Actions'])
  })

  it('moves the cells with the heading, so each value stays under its own column', () => {
    render(<BoardListView />)
    fireEvent.dragStart(header('Channel'))
    fireEvent.drop(header('Region'))
    const firstRow = screen.getAllByRole('row')[1]
    const cells = within(firstRow).getAllByRole('cell').map((c) => c.textContent?.trim())
    expect(cells[2]).toBe('Advisor')
    expect(cells[3]).toBe('South Africa')
  })

  it('keeps the name first and the actions last however the columns are moved', () => {
    render(<BoardListView />)
    fireEvent.dragStart(header('Region'))
    fireEvent.drop(header('Email Name'))
    fireEvent.dragStart(header('Email Name'))
    fireEvent.drop(header('Actions'))
    expect(headers()[0]).toBe('Email Name')
    expect(headers()[headers().length - 1]).toBe('Actions')
  })

  it('remembers the order for next time', () => {
    const first = render(<BoardListView />)
    fireEvent.dragStart(header('Channel'))
    fireEvent.drop(header('Stage'))
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(['channel', 'column', 'region'])
    first.unmount()
    render(<BoardListView />)
    expect(headers()).toEqual(['Email Name', 'Channel', 'Stage', 'Region', 'Actions'])
  })

  it('moves a focused column with Alt and the arrow keys', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    header('Region').focus()
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(headers()).toEqual(['Email Name', 'Region', 'Stage', 'Channel', 'Actions'])
  })

  it('can put the columns back in the configured order', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    expect(screen.queryByRole('button', { name: 'Reset column order' })).toBeNull()
    fireEvent.dragStart(header('Channel'))
    fireEvent.drop(header('Stage'))
    await user.click(screen.getByRole('button', { name: 'Reset column order' }))
    expect(headers()).toEqual(['Email Name', 'Stage', 'Region', 'Channel', 'Actions'])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
