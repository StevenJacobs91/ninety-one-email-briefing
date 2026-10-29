// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'
import { HistoryTimeline } from '../HistoryTimeline'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: [], channel: [], clientGroup: [], sendDate: '2030-01-01', contentApprovalDate: '', urgency: 'standard', column: 'in-progress',
  submittedAt: '2026-10-20T08:00:00Z', notes: '', tags: '',
  columnHistory: [
    { column: 'briefed', at: '2026-10-20T10:00:00Z' },
    { column: 'in-progress', at: '2026-10-22T14:00:00Z', by: 'Sam' },
  ],
  activity: [
    { id: 'a1', at: '2026-10-21T12:00:00Z', by: 'Amy', field: 'subjectLine', label: 'Subject line', from: 'Hello', to: 'New' },
    { id: 'a2', at: '2026-10-23T12:00:00Z', by: 'Sam', field: 'comment', label: 'Comment', to: 'Looks good' },
  ],
}

afterEach(cleanup)

describe('the card\'s history', () => {
  it('lists the moves and every change together, oldest first, with what changed and who did it', () => {
    render(<HistoryTimeline card={card} />)
    expect(screen.getByText('History')).toBeTruthy()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items.map((li) => li.querySelector('[data-title]')?.textContent)).toEqual([
      'Added to Briefed', 'Subject line changed', 'Moved to In Progress', 'Comment added',
    ])
    expect(items[1].textContent).toContain('Hello → New')
    expect(items[1].textContent).toContain('Amy')
    expect(items[1].textContent).toContain('Oct 2026')
    expect(items[2].textContent).toContain('Sam')
    expect(items[3].textContent).toContain('Looks good')
  })

  it('shows the moves alone for a card whose changes have not been read yet', () => {
    render(<HistoryTimeline card={{ ...card, activity: undefined }} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says so when there is nothing to show', () => {
    render(<HistoryTimeline card={{ ...card, columnHistory: [], activity: [] }} />)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText('Nothing has happened on this card yet.')).toBeTruthy()
  })
})
