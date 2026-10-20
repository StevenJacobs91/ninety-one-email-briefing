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
const pill = () => screen.getByRole('button', { name: /Subject line score|Open the subject line tester/ })

describe('score pill (AC-26)', () => {
  it('shows the live score and band', () => {
    render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    expect(pill().textContent).toBe('100% · Great')
  })

  it('updates as the subject changes', () => {
    const { rerender } = render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    rerender(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    settle()
    expect(pill().textContent).toBe('60% · Needs work')
  })

  it('invites a first test when there is no subject yet', () => {
    render(<SubjectLineScore subject="" />)
    expect(pill().textContent).toBe('Test subject line')
  })

  it('is advisory: clicking it does not submit a surrounding form', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(<form onSubmit={onSubmit}><SubjectLineScore subject="Hello world today" /></form>)
    fireEvent.click(pill())
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('expandable issues', () => {
  it('lists what to fix, with the reason and the tip', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="FREE MONEY!!! Act now" />)
    const toggle = screen.getByRole('button', { name: '3 issues' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(/Contains a spam or compliance trigger/)).toBeTruthy()
    expect(screen.getAllByText(/Fix:/).length).toBeGreaterThan(0)
  })

  it('says when there is nothing to fix', () => {
    render(<SubjectLineScore subject="Your 50% off gift is waiting" />)
    expect(screen.getByRole('button', { name: 'No issues' })).toBeTruthy()
  })
})

describe('full tester dialog (AC-26)', () => {
  it('opens pre-filled with the subject, sender and preheader', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="Your 50% off gift is waiting" senderName="Ninety One" preheader="Read the full outlook" />)
    await user.click(pill())
    const dialog = screen.getByRole('dialog', { name: 'Subject Line Tester' })
    expect((within(dialog).getByLabelText('Subject line') as HTMLInputElement).value).toBe('Your 50% off gift is waiting')
    expect((within(dialog).getByLabelText(/Sender name/) as HTMLInputElement).value).toBe('Ninety One')
    expect((within(dialog).getByLabelText(/Preheader text/) as HTMLInputElement).value).toBe('Read the full outlook')
    expect(document.activeElement).toBe(within(dialog).getByLabelText('Subject line'))
  })

  it('closes with Escape and returns focus to the pill', async () => {
    const user = userEvent.setup({ delay: null })
    render(<SubjectLineScore subject="Hello world today" />)
    pill().focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(pill())
  })

  it('hands the edited subject back with "Apply to brief"', async () => {
    const user = userEvent.setup({ delay: null })
    const onApply = vi.fn()
    render(<SubjectLineScore subject="Hello world today" onApplySubject={onApply} />)
    await user.click(pill())
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
    await user.click(pill())
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
    expect(pill().textContent).toBe('100% · Great')
    unmount()
    render(<SubjectLineScore subject={subject} deps={deps} />)
    expect(pill().textContent).toBe('60% · Needs work')
    await user.click(pill())
    // The dialog analyses with the same adapters.
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: /Score 60 percent/ })).toBeTruthy()
  })
})
