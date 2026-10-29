// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../types/kanban.types'

const queries = vi.hoisted(() => ({
  fetchKanbanCards: vi.fn(), insertKanbanCard: vi.fn(), updateKanbanCard: vi.fn(), deleteKanbanCard: vi.fn(),
  fetchBriefById: vi.fn(), saveBrief: vi.fn(), insertCardActivity: vi.fn(), fetchCardActivity: vi.fn(),
}))
vi.mock('../supabaseQueries', () => queries)
vi.mock('../approvalsService', () => ({ distributeWithOverride: vi.fn() }))
vi.mock('../notificationService', () => ({ triggerNotification: vi.fn().mockResolvedValue({ success: true }) }))
const audit = vi.hoisted(() => ({ writeAuditLog: vi.fn() }))
vi.mock('../auditLog', () => audit)
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'u1', teamId: 't', displayName: 'Paula', role: 'producer' }, user: { id: 'u1', email: 'p@x.com' } }),
}))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { audit: {}, notifications: { enabled: false } } }) }))

import { KanbanProvider, useKanban } from '../../contexts/KanbanContext'

const card = (extra: Partial<KanbanCard> = {}): KanbanCard => ({
  id: 'c1', briefId: 'b1', emailName: 'Taking Stock', emailType: 'newsletter', theme: 'agulhas-gold', subjectLine: 'Old subject',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: ['Southern Africa'], sendDate: '2026-11-01', contentApprovalDate: '2026-10-28', urgency: 'standard',
  column: 'briefed', submittedAt: '2026-10-20T10:00:00Z', columnHistory: [{ column: 'briefed', at: '2026-10-20T10:00:00Z' }],
  notes: '', tags: '', ...extra,
})
const brief = () => ({ meta: { briefId: 'b1', status: 'submitted', updatedAt: 'x' }, campaign: { subjectLine: 'Old subject', theme: 'agulhas-gold' }, audience: {}, deadlines: {} })

let result: unknown
function Board() {
  const { cards, moveCard, updateCardDetails, updateCardMeta, updateCardNotes, addComment, loadActivity } = useKanban()
  return (
    <div>
      {cards.map((c) => <p key={c.id} data-testid="card">{c.column}|{c.startDate ?? 'no start'}|{c.subjectLine}</p>)}
      {cards.map((c) => <p key={`a${c.id}`} data-testid="activity">{c.activity ? c.activity.map((a) => a.field).join('+') || 'none' : 'unloaded'}</p>)}
      <button onClick={() => updateCardMeta('c1', { assignee: 'Amy', progress: 0 })}>Assign</button>
      <button onClick={() => updateCardNotes('c1', 'New notes')}>Write notes</button>
      <button onClick={() => addComment('c1', { authorId: 'u1', authorName: 'Paula', text: 'Looks good', createdAt: '2026-10-29T10:00:00Z' })}>Comment</button>
      <button onClick={() => { void loadActivity('c1') }}>Load history</button>
      <button onClick={() => moveCard('c1', 'in-progress')}>Start</button>
      <button onClick={async () => { result = await updateCardDetails('c1', { subjectLine: 'New subject' }) }}>Edit subject</button>
      <button onClick={async () => { result = await updateCardDetails('c1', { subjectLine: '  ' }) }}>Blank subject</button>
    </div>
  )
}

async function mount(c: KanbanCard = card()) {
  queries.fetchKanbanCards.mockResolvedValue([c])
  render(<KanbanProvider><Board /></KanbanProvider>)
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
}
const click = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }
const text = () => screen.getByTestId('card').textContent

beforeEach(() => {
  Object.values(queries).forEach((fn) => fn.mockReset())
  queries.updateKanbanCard.mockResolvedValue(undefined)
  queries.fetchBriefById.mockResolvedValue(brief())
  queries.saveBrief.mockResolvedValue(undefined)
  queries.insertCardActivity.mockResolvedValue(undefined)
  queries.fetchCardActivity.mockResolvedValue([])
  audit.writeAuditLog.mockReset()
  result = undefined
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('production start', () => {
  it('is recorded as the day the card moves to In Progress, on the card and in the database', async () => {
    await mount()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 29, 15, 0))
    await click('Start')
    expect(text()).toBe('in-progress|2026-10-29|Old subject')
    expect(queries.updateKanbanCard).toHaveBeenCalledWith('c1', expect.objectContaining({ column: 'in-progress', startDate: '2026-10-29' }))
  })

  it('never replaces a start date that is already there', async () => {
    await mount(card({ startDate: '2026-10-01' }))
    await click('Start')
    expect(text()).toBe('in-progress|2026-10-01|Old subject')
    expect(queries.updateKanbanCard.mock.calls[0][1]).not.toHaveProperty('startDate')
  })
})

describe('the card\'s history', () => {
  const recorded = () => queries.insertCardActivity.mock.calls.flatMap((c) => c[3] as { field: string; from?: string; to?: string; by: string }[])

  it('records who moved the card, in the stage history', async () => {
    await mount()
    await click('Start')
    const history = queries.updateKanbanCard.mock.calls[0][1].columnHistory as { column: string; by?: string }[]
    expect(history[history.length - 1]).toMatchObject({ column: 'in-progress', by: 'Paula' })
  })

  it('records each field an edit really changed, under the editor\'s name, once the change has been saved', async () => {
    await mount()
    await click('Edit subject')
    expect(queries.insertCardActivity).toHaveBeenCalledTimes(1)
    expect(queries.insertCardActivity.mock.calls[0].slice(0, 3)).toEqual(['t', 'u1', 'c1'])
    expect(recorded()).toEqual([expect.objectContaining({ field: 'subjectLine', from: 'Old subject', to: 'New subject', by: 'Paula' })])
  })

  it('records nothing for an edit that could not be saved', async () => {
    queries.saveBrief.mockRejectedValue(new Error('no'))
    await mount()
    await click('Edit subject')
    expect(queries.insertCardActivity).not.toHaveBeenCalled()
  })

  it('records an assignee change and ignores the fields saved along with it that did not change', async () => {
    await mount()
    await click('Assign')
    expect(recorded().map((e) => [e.field, e.from, e.to])).toEqual([['assignee', '—', 'Amy']])
  })

  it('records notes and comments', async () => {
    await mount()
    await click('Write notes')
    await click('Comment')
    expect(recorded().map((e) => [e.field, e.to])).toEqual([['notes', 'New notes'], ['comment', 'Looks good']])
  })

  it('is read when asked for, and then grows with each change without being read again', async () => {
    queries.fetchCardActivity.mockResolvedValue([{ id: 'old', at: '2026-10-21T10:00:00Z', by: 'Sam', field: 'tags', label: 'Tags', from: 'a', to: 'b' }])
    await mount()
    expect(screen.getByTestId('activity').textContent).toBe('unloaded')
    await click('Load history')
    expect(screen.getByTestId('activity').textContent).toBe('tags')
    await click('Assign')
    expect(screen.getByTestId('activity').textContent).toBe('tags+assignee')
    expect(queries.fetchCardActivity).toHaveBeenCalledTimes(1)
  })
})

describe('editing a card\'s brief fields', () => {
  it('saves to the brief first and then the card, and shows the change at once', async () => {
    const order: string[] = []
    queries.saveBrief.mockImplementation(async () => { order.push('brief') })
    queries.updateKanbanCard.mockImplementation(async () => { order.push('card') })
    await mount()
    await click('Edit subject')
    expect(result).toEqual({ ok: true })
    expect(order).toEqual(['brief', 'card'])
    const saved = queries.saveBrief.mock.calls[0]
    expect(saved[0]).toBe('t')
    expect(saved[1]).toBe('u1')
    expect(saved[2].campaign.subjectLine).toBe('New subject')
    expect(queries.updateKanbanCard).toHaveBeenCalledWith('c1', { subjectLine: 'New subject' })
    expect(text()).toContain('New subject')
    expect(audit.writeAuditLog).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ action: 'Edited card details' }))
  })

  it('puts the card back, and writes nothing to it, when the brief cannot be saved', async () => {
    queries.saveBrief.mockRejectedValue(new Error('Failed to save brief: permission denied'))
    await mount()
    await click('Edit subject')
    expect(result).toEqual({ ok: false, error: 'Failed to save brief: permission denied' })
    expect(text()).toContain('Old subject')
    expect(queries.updateKanbanCard).not.toHaveBeenCalled()
  })

  it('refuses an edit that would break the brief, before anything is written', async () => {
    await mount()
    await click('Blank subject')
    expect(result).toEqual({ ok: false, error: 'The subject line cannot be empty.' })
    expect(text()).toContain('Old subject')
    expect(queries.fetchBriefById).not.toHaveBeenCalled()
    expect(queries.saveBrief).not.toHaveBeenCalled()
    expect(queries.updateKanbanCard).not.toHaveBeenCalled()
  })

  it('still updates a card that has no saved brief, such as one added by hand', async () => {
    queries.fetchBriefById.mockResolvedValue(null)
    await mount()
    await click('Edit subject')
    expect(result).toEqual({ ok: true })
    expect(queries.saveBrief).not.toHaveBeenCalled()
    expect(queries.updateKanbanCard).toHaveBeenCalledWith('c1', { subjectLine: 'New subject' })
    expect(text()).toContain('New subject')
  })
})
