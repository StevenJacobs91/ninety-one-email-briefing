// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'
import { defaultCardFields } from '../../../lib/boardConfig'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, cards: [] as unknown[], role: 'producer', updateCardMeta: vi.fn() }))

vi.mock('../../../contexts/KanbanContext', () => ({ useKanban: () => ({ cards: state.cards, moveCard: vi.fn(), updateCardMeta: state.updateCardMeta }) }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ profile: { role: state.role } }) }))
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
  state.role = 'producer'
  state.updateCardMeta.mockClear()
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

  it('can put the columns back as configured', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    expect(screen.queryByRole('button', { name: 'Reset columns' })).toBeNull()
    fireEvent.dragStart(header('Channel'))
    fireEvent.drop(header('Stage'))
    await user.click(screen.getByRole('button', { name: 'Reset columns' }))
    expect(headers()).toEqual(['Email Name', 'Stage', 'Region', 'Channel', 'Actions'])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('BoardListView columns picker, scrolling and alignment', () => {
  const VIS = 'ni-board-list-visible'
  const open = async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Columns' }))
  const box = () => screen.getByRole('group', { name: 'Show columns' })

  it('offers every column with the shown ones ticked', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    expect(screen.queryByRole('group', { name: 'Show columns' })).toBeNull()
    await open(user)
    expect((within(box()).getByRole('checkbox', { name: 'Region' }) as HTMLInputElement).checked).toBe(true)
    expect((within(box()).getByRole('checkbox', { name: 'Channel' }) as HTMLInputElement).checked).toBe(true)
    expect((within(box()).getByRole('checkbox', { name: 'Tags' }) as HTMLInputElement).checked).toBe(false)
    expect(within(box()).getByRole('checkbox', { name: 'Attachments' })).toBeTruthy()
  })

  it('removes a column, with its cells, when it is unticked', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    await open(user)
    await user.click(within(box()).getByRole('checkbox', { name: 'Region' }))
    expect(headers()).toEqual(['Email Name', 'Stage', 'Channel', 'Actions'])
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell').map((c) => c.textContent?.trim())
    expect(cells).not.toContain('South Africa')
  })

  it('adds a column when it is ticked, next to where it belongs', async () => {
    const user = userEvent.setup()
    state.cards = [card({ tags: 'quarterly' })]
    render(<BoardListView />)
    await open(user)
    await user.click(within(box()).getByRole('checkbox', { name: 'Tags' }))
    expect(headers()).toEqual(['Email Name', 'Stage', 'Region', 'Channel', 'Tags', 'Actions'])
    expect(screen.getByText('quarterly')).toBeTruthy()
  })

  it('remembers the choice, and restores the configured columns on reset', async () => {
    const user = userEvent.setup()
    const first = render(<BoardListView />)
    await open(user)
    await user.click(within(box()).getByRole('checkbox', { name: 'Region' }))
    expect(JSON.parse(localStorage.getItem(VIS)!)).toEqual(['column', 'channel'])
    first.unmount()
    render(<BoardListView />)
    expect(headers()).toEqual(['Email Name', 'Stage', 'Channel', 'Actions'])
    await user.click(screen.getByRole('button', { name: 'Reset columns' }))
    expect(headers()).toEqual(['Email Name', 'Stage', 'Region', 'Channel', 'Actions'])
    expect(localStorage.getItem(VIS)).toBeNull()
  })

  it('closes the picker with Escape', async () => {
    const user = userEvent.setup()
    render(<BoardListView />)
    await open(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Show columns' })).toBeNull()
  })

  it('scrolls sideways when there are more columns than fit, instead of clipping them', () => {
    const { container } = render(<BoardListView />)
    const table = container.querySelector('table')!
    const scroller = table.parentElement!
    expect(scroller.className).toMatch(/overflow-auto/)
    expect(scroller.className).not.toMatch(/overflow-hidden/)
    expect(table.className).toMatch(/min-w-max/)
  })

  it('keeps the headings at the top while the rows scroll, and the name heading in the corner', () => {
    const { container } = render(<BoardListView />)
    // The table's own area scrolls, so sticky headings stay put; the page toolbar above it does not scroll away.
    const scroller = container.querySelector('table')!.parentElement!
    expect(scroller.className).toMatch(/h-full/)
    for (const th of Array.from(container.querySelectorAll('thead th'))) {
      expect(th.className, th.textContent ?? '').toMatch(/sticky/)
      expect(th.className).toMatch(/top-0/)
      expect(th.className).toMatch(/bg-gray-50/)
    }
    expect(header('Email Name').className).toMatch(/left-0/)
    expect(container.firstElementChild!.className).toMatch(/overflow-hidden/)
  })

  it('keeps the toolbar and its menus above the table\'s sticky headings', () => {
    const { container } = render(<BoardListView />)
    const layer = (el: Element) => Number(el.className.match(/(?:^|\s)z-(\d+)/)?.[1] ?? 0)
    const toolbar = container.querySelector('input[type="search"]')!.closest('div.z-40')!
    fireEvent.click(screen.getByRole('button', { name: /^Columns/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Group by/ }))
    const highestHeading = Math.max(...Array.from(container.querySelectorAll('thead th')).map(layer))
    expect(layer(toolbar)).toBeGreaterThan(highestHeading)
    expect(layer(screen.getByRole('radiogroup', { name: 'Group by' }))).toBeGreaterThan(layer(toolbar) - 1)
  })

  it('grouped, the one row of headings stays at the top as the cards scroll under it', () => {
    localStorage.setItem('ni-board-list-group', 'column')
    const { container } = render(<BoardListView />)
    const bar = container.querySelector('table')!.closest('div.sticky')!
    expect(bar.className).toMatch(/top-0/)
    expect(bar.className).toMatch(/bg-gray-50/)
    expect(bar.parentElement!.parentElement!.className).toMatch(/overflow-auto/)
  })

  it('gives every heading and its cells the same padding and left alignment', () => {
    const { container } = render(<BoardListView />)
    const ths = Array.from(container.querySelectorAll('thead th'))
    const row = Array.from(container.querySelectorAll('tbody tr:first-child td'))
    expect(ths.length).toBe(row.length)
    ths.forEach((th, i) => {
      for (const cls of ['px-4', 'text-left']) {
        expect(th.className, `heading ${i}`).toContain(cls)
        expect(row[i].className, `cell ${i}`).toContain(cls)
      }
    })
  })

  it('keeps the email name in view while the other columns scroll', () => {
    const { container } = render(<BoardListView />)
    expect(container.querySelector('thead th')!.className).toMatch(/sticky/)
    expect(container.querySelector('tbody tr td')!.className).toMatch(/sticky/)
  })
})

describe('BoardListView grouping', () => {
  beforeEach(() => {
    state.cards = [
      card({ id: 'a', emailName: 'Alpha', column: 'in-progress' }),
      card({ id: 'b', emailName: 'Bravo', column: 'briefed' }),
      card({ id: 'c', emailName: 'Charlie', column: 'briefed' }),
    ]
  })

  const groupBy = (label: string) => {
    if (!screen.queryByRole('radiogroup', { name: 'Group by' })) fireEvent.click(screen.getByRole('button', { name: /^Group by/ }))
    fireEvent.click(screen.getByRole('radio', { name: label }))
  }

  it('is a button like Filters and Columns, and opens a list of every field to group by', () => {
    render(<BoardListView />)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Group by/ }))
    const options = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(screen.getByRole('radiogroup', { name: 'Group by' })).toBeTruthy()
    expect(options.map((o) => o.closest('label')?.textContent)).toEqual(['None', 'Stage', 'Urgency', 'Type', 'Submitted by', 'Assignee', 'Region', 'Channel', 'Status', 'Send date'])
    expect(options[0].checked).toBe(true)
    expect(screen.queryByRole('button', { name: /^Briefed\s*\d/ })).toBeNull()
  })

  it('closes after a choice, on Escape, and says what it is grouped by', () => {
    render(<BoardListView />)
    groupBy('Stage')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByRole('button', { name: /^Group by\s*Stage/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Group by/ }))
    expect(screen.getByRole('radiogroup')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('grouping by stage gives each stage its own card under a labelled tab, with a count', () => {
    render(<BoardListView />)
    groupBy('Stage')
    const briefed = screen.getByRole('region', { name: 'Briefed group' })
    const progress = screen.getByRole('region', { name: 'In Progress group' })
    expect(within(briefed).getByRole('button', { name: /^Briefed\s*2/ })).toBeTruthy()
    expect(within(briefed).getAllByRole('row').map((r) => r.textContent)).toEqual([expect.stringContaining('Bravo'), expect.stringContaining('Charlie')])
    expect(within(progress).getByRole('button', { name: /^In Progress\s*1/ })).toBeTruthy()
    expect(within(progress).getAllByRole('row').length).toBe(1)
    expect(within(briefed).queryByText('Alpha')).toBeNull()
  })

  it('shows the column headings once, above the groups, with the same widths in every card', () => {
    render(<BoardListView />)
    groupBy('Stage')
    expect(screen.getAllByRole('columnheader', { name: 'Email Name' }).length).toBe(1)
    const widths = Array.from(document.querySelectorAll('table')).map((t) => Array.from(t.querySelectorAll('col')).map((c) => (c as HTMLElement).style.width).join())
    expect(new Set(widths).size).toBe(1)
  })

  it('a group folds away and opens again, and starts open when the grouping changes', () => {
    render(<BoardListView />)
    groupBy('Stage')
    const heading = screen.getByRole('button', { name: /^Briefed\s*\d/ })
    expect(heading.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(heading)
    expect(heading.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Bravo')).toBeNull()
    fireEvent.click(heading)
    expect(screen.getByText('Bravo')).toBeTruthy()
  })

  it('remembers the grouping in this browser, and None clears it', () => {
    const { unmount } = render(<BoardListView />)
    groupBy('Urgency')
    expect(localStorage.getItem('ni-board-list-group')).toBe('urgency')
    unmount()
    render(<BoardListView />)
    expect(screen.getByRole('button', { name: /^Group by\s*Urgency/ })).toBeTruthy()
    groupBy('None')
    expect(localStorage.getItem('ni-board-list-group')).toBeNull()
  })

  it('keeps the chosen sort inside each group', () => {
    render(<BoardListView />)
    groupBy('Stage')
    fireEvent.click(header('Email Name'))
    fireEvent.click(header('Email Name'))
    const names = within(screen.getByRole('region', { name: 'Briefed group' })).getAllByRole('row').map((r) => r.textContent ?? '')
    expect(names[0]).toContain('Charlie')
    expect(names[1]).toContain('Bravo')
  })
})

describe('BoardListView progress', () => {
  beforeEach(() => {
    state.settings = { approvals: { enabled: false }, campaignPlanner: { cardFields: only('progress') } }
    state.cards = [card({ id: 'p1', progress: 70 })]
  })

  it('a click on the bar sets progress for that brief, to the nearest ten per cent', () => {
    render(<BoardListView />)
    const slider = screen.getByRole('slider', { name: 'Progress' })
    slider.getBoundingClientRect = () => ({ left: 0, width: 100, right: 100, top: 0, bottom: 0, height: 10, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.click(slider, { clientX: 43 })
    expect(state.updateCardMeta).toHaveBeenCalledWith('p1', { progress: 40 })
  })

  it('a requester sees the bar but cannot change it', () => {
    state.role = 'requester'
    render(<BoardListView />)
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getByText('70%')).toBeTruthy()
  })
})
