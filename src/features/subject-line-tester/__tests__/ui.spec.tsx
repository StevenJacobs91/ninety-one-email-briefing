// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SubjectLineTester } from '../components/SubjectLineTester'

// Testing Library only advances fake timers when it finds a `jest` global; Vitest's `vi` has the same API.
Object.assign(globalThis, { jest: vi })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const setup = () => userEvent.setup({ delay: null })
const subjectBox = () => screen.getByLabelText('Subject line') as HTMLInputElement
const gauge = () => screen.getByRole('img', { name: /score|no score/i })
const settle = (ms = 300) => act(() => { vi.advanceTimersByTime(ms) })

describe('empty state (AC-14)', () => {
  it('shows no score and no errors when the input is empty', () => {
    render(<SubjectLineTester />)
    expect(gauge().getAttribute('aria-label')).toBe('No score yet')
    expect(screen.getByText('Awaiting subject line')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/\d+%/)).toBeNull()
  })
})

describe('live scoring (AC-10, AC-11)', () => {
  it('updates the score within 300 ms of the last keystroke, with no network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const user = setup()
    render(<SubjectLineTester />)
    await user.type(subjectBox(), 'Your 50% off gift is waiting')
    settle(300)
    expect(gauge().getAttribute('aria-label')).toBe('Score 100 percent, Great')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows the score, the band label and a different band for a poor subject', async () => {
    const user = setup()
    render(<SubjectLineTester />)
    await user.type(subjectBox(), 'FREE MONEY!!! Act now')
    settle()
    expect(gauge().getAttribute('aria-label')).toBe('Score 60 percent, Needs work')
    expect(screen.getByText('60%')).toBeTruthy()
    expect(screen.getByText('Needs work')).toBeTruthy()
  })

  it('"Test now" analyses immediately', async () => {
    const user = setup()
    render(<SubjectLineTester showTestNow />)
    await user.type(subjectBox(), 'FREE MONEY!!! Act now')
    await user.click(screen.getByRole('button', { name: 'Test now' }))
    expect(gauge().getAttribute('aria-label')).toBe('Score 60 percent, Needs work')
  })
})

describe('category cards (AC-12)', () => {
  it('shows passed/4, the key metric line and an expandable checklist with reason and tip', async () => {
    const user = setup()
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} />)
    const wording = screen.getByRole('region', { name: /Wording: 1 of 4/ })
    expect(within(wording).getByText('1/4')).toBeTruthy()
    expect(within(wording).getByText('1 flagged term')).toBeTruthy()
    expect(screen.getByText('21 characters · 4 words')).toBeTruthy()
    expect(screen.getByText('0 emoji')).toBeTruthy()

    const toggle = within(wording).getByRole('button', { name: /Wording/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(wording).getByText(/Contains a spam or compliance trigger/)).toBeTruthy()
    expect(within(wording).getAllByText(/Fix:/).length).toBeGreaterThan(0)
  })

  it('says Passed or Needs fixing in words, not by colour alone (AC-22)', async () => {
    const user = setup()
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} />)
    await user.click(screen.getByRole('button', { name: /Wording/ }))
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0)
    expect(screen.getByText('Failed (critical)')).toBeTruthy()
    expect(screen.getAllByText('Needs fixing').length).toBeGreaterThan(0)
  })

  it('opens and closes from the keyboard (AC-23)', async () => {
    const user = setup()
    render(<SubjectLineTester initial={{ subject: 'Your 50% off gift is waiting' }} />)
    const toggle = screen.getByRole('button', { name: /Length/ })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    await user.keyboard(' ')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })
})

describe('highlighting (AC-13)', () => {
  it('marks flagged terms, ALL-CAPS words and excess punctuation in the echo', () => {
    render(<SubjectLineTester initial={{ subject: 'FREE MONEY!!! Act now' }} />)
    const marks = Array.from(document.querySelectorAll('mark')).map((m) => m.textContent)
    expect(marks).toEqual(expect.arrayContaining(['FREE', 'MONEY', '!!!']))
  })

  it('shows the rendered text, with merge tags as sample values', () => {
    render(<SubjectLineTester initial={{ subject: 'Hi {{Recipient.FirstName}}, your Q4 outlook is here' }} />)
    expect(screen.getByLabelText(/Subject line with/).textContent).toContain('Hi Alexandra, your Q4 outlook is here')
  })
})

describe('input (AC-15)', () => {
  it('shows a character counter', async () => {
    const user = setup()
    render(<SubjectLineTester />)
    expect(screen.getByText('0 / 150 characters')).toBeTruthy()
    await user.type(subjectBox(), 'Sale 🇿🇦')
    expect(screen.getByText('6 / 150 characters')).toBeTruthy()
  })

  it('hard-limits the subject to 150 characters', async () => {
    const user = setup()
    render(<SubjectLineTester />)
    await user.click(subjectBox())
    await user.paste('a'.repeat(200))
    expect(Array.from(subjectBox().value)).toHaveLength(150)
    expect(screen.getByText('150 / 150 characters')).toBeTruthy()
  })
})

describe('screen reader announcement (AC-22)', () => {
  it('announces the score politely, after the user pauses, not on every keystroke', async () => {
    const user = setup()
    render(<SubjectLineTester />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    await user.type(subjectBox(), 'Your 50% off gift is waiting')
    settle(300)
    expect(region.textContent).toBe('')
    settle(1000)
    expect(region.textContent).toBe('Score 100 percent, Great.')
  })
})
