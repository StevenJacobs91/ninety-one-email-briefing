// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SubjectLineScore } from '../components/SubjectLineScore'
import { createMockDeps } from '../adapters/mock/createMockDeps'
import type { LexiconProvider } from '../adapters'

Object.assign(globalThis, { jest: vi })
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const settle = (ms = 300) => act(() => { vi.advanceTimersByTime(ms) })
const seeMore = () => screen.getByRole('button', { name: 'See full tester' })
const bar = () => screen.getByRole('img', { name: /Score|No score yet/ })

describe('inline score panel (AC-26)', () => {
  it('shows the live score and band as a prominent bar in the section', () => {
    render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    expect(bar().getAttribute('aria-label')).toBe('Score 100 percent, Great.')
    expect(screen.getByText('100%')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Subject line score' })).toBeTruthy()
  })

  it('updates as the subject changes', () => {
    const { rerender } = render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    rerender(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    settle()
    expect(bar().getAttribute('aria-label')).toBe('Score 60 percent, Needs work.')
    expect(screen.getByText('60%')).toBeTruthy()
  })

  it('invites a first test when there is no subject yet', () => {
    render(<SubjectLineScore subject="" />)
    expect(screen.getByText(/Type a subject line/)).toBeTruthy()
    expect(bar().getAttribute('aria-label')).toBe('No score yet.')
    expect(seeMore()).toBeTruthy()
  })

  it('is advisory: clicking See full tester does not submit a surrounding form', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(<form onSubmit={onSubmit}><SubjectLineScore subject="Hello world today" /></form>)
    fireEvent.click(seeMore())
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('issues shown in the panel', () => {
  it('lists what to fix straight away, with the reason and the tip, and counts them', () => {
    render(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    const panel = screen.getByRole('region', { name: 'Subject line score' })
    expect(within(panel).getByText('3 issues')).toBeTruthy()
    expect(within(panel).getByText(/Contains a spam or compliance trigger/)).toBeTruthy()
    expect(within(panel).getAllByText(/Fix:/).length).toBeGreaterThan(0)
  })

  it('shows all of a few issues, with no "more" line', () => {
    render(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText(/more in the full tester/)).toBeNull()
  })

  it('shows the three most important issues, the critical one first, and points to the full tester for the rest', () => {
    render(<SubjectLineScore subject="FREE MONEY!!! ACT NOW!!! CLICK HERE to win a guaranteed prize today 🎉🎉🎉" />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0].textContent).toMatch(/Fix first/)
    expect(screen.getByText('4 more in the full tester')).toBeTruthy()
  })

  it('says when there is nothing to fix', () => {
    render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    expect(screen.getByText('No issues')).toBeTruthy()
    expect(screen.getByText(/Every check passed/)).toBeTruthy()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('marks a critical issue so it reads as the one to fix first', () => {
    render(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    expect(screen.getAllByText('Fix first').length).toBe(1)
  })
})

describe('full tester dialog (AC-26)', () => {
  it('opens pre-filled with the subject, sender and preheader', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="Your 50% off gift is waiting" senderName="Ninety One" preheader="Read the full outlook" />)
    await user.click(seeMore())
    const dialog = screen.getByRole('dialog', { name: 'Subject Line Tester' })
    expect((within(dialog).getByLabelText('Subject line') as HTMLInputElement).value).toBe('Your 50% off gift is waiting')
    expect((within(dialog).getByLabelText(/Sender name/) as HTMLInputElement).value).toBe('Ninety One')
    expect((within(dialog).getByLabelText(/Preheader text/) as HTMLInputElement).value).toBe('Read the full outlook')
    expect(document.activeElement).toBe(within(dialog).getByLabelText('Subject line'))
  })

  it('closes with Escape and returns focus to the See full tester button', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="Hello world today" />)
    seeMore().focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(seeMore())
  })

  it('hands the edited subject back with "Apply to brief"', async () => {
    const user = userEvent.setup({ delay: null })
    const onApply = vi.fn()
    render(<SubjectLineScore subject="Hello world today" onApplySubject={onApply} />)
    await user.click(seeMore())
    const input = screen.getByLabelText('Subject line')
    await user.clear(input)
    await user.type(input, 'A better subject line')
    await user.click(screen.getByRole('button', { name: 'Apply to brief' }))
    expect(onApply).toHaveBeenCalledWith('A better subject line')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('has no Apply button when nothing can receive the result', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="Hello world today" />)
    await user.click(seeMore())
    expect(screen.queryByRole('button', { name: 'Apply to brief' })).toBeNull()
  })
})

describe('swapping an adapter (AC-27)', () => {
  it('uses a different LexiconProvider with no change to the engine or components', async () => {
    const strict: LexiconProvider = {
      getSpamTerms: () => [{ term: 'quarterly', severity: 'critical', pack: 'general-spam' }],
      getHookTerms: () => ['quarterly'],
      getAcronymAllowlist: () => [],
    }
    const deps = { ...createMockDeps(), lexicon: strict }
    const user = userEvent.setup({ delay: null })
    const subject = 'Your quarterly update is ready'
    const { unmount } = render(<SubjectLineScore subject={subject} />)
    expect(bar().getAttribute('aria-label')).toBe('Score 100 percent, Great.')
    unmount()
    render(<SubjectLineScore subject={subject} deps={deps} />)
    expect(bar().getAttribute('aria-label')).toBe('Score 60 percent, Needs work.')
    await user.click(seeMore())
    // The dialog analyses with the same adapters.
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: /Score 60 percent/ })).toBeTruthy()
  })
})
