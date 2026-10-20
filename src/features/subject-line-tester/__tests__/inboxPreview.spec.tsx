// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InboxPreview } from '../components/InboxPreview/InboxPreview'
import { SubjectLineTester } from '../components/SubjectLineTester'

afterEach(cleanup)

const SUBJECT_55 = 'Register to join | Navigating a rapidly changing market'

describe('InboxPreview structure (AC-16)', () => {
  it('draws a desktop window with 8 rows and a phone with 3 items, the first highlighted in each', () => {
    render(<InboxPreview subject="Hello there" />)
    const desktop = screen.getByTestId('desktop-preview')
    expect(desktop.querySelectorAll('li')).toHaveLength(8)
    expect(within(desktop).getByTestId('desktop-subject').textContent).toBe('Hello there')
    const mobile = screen.getByTestId('mobile-preview')
    expect(mobile.querySelectorAll('li')).toHaveLength(3)
    expect(within(mobile).getByTestId('mobile-subject').textContent).toBe('Hello there')
  })

  it('shows the placeholder when there is no subject', () => {
    render(<InboxPreview subject="" />)
    expect(screen.getByTestId('desktop-subject').textContent).toBe('Your subject line will appear here')
    expect(screen.getByTestId('mobile-subject').textContent).toBe('Your subject line will appear here')
    expect(screen.getByTestId('mobile-subject').getAttribute('data-truncated')).toBe('false')
  })
})

describe('truncation (AC-17)', () => {
  it('a 55-character subject is whole on desktop and cut off on mobile', () => {
    expect(SUBJECT_55).toHaveLength(55)
    render(<InboxPreview subject={SUBJECT_55} />)
    expect(screen.getByTestId('desktop-subject').getAttribute('data-truncated')).toBe('false')
    expect(screen.getByTestId('mobile-subject').getAttribute('data-truncated')).toBe('true')
  })

  it('uses a text-overflow ellipsis on one line, with a width set from the character limit', () => {
    render(<InboxPreview subject={SUBJECT_55} mobileChars={40} charWidthEm={0.5} />)
    const el = screen.getByTestId('mobile-subject')
    expect(el.className).toMatch(/text-ellipsis/)
    expect(el.className).toMatch(/whitespace-nowrap/)
    expect(el.style.maxWidth).toBe('20em')
  })

  it('limits are configurable', () => {
    render(<InboxPreview subject={SUBJECT_55} desktopChars={50} />)
    expect(screen.getByTestId('desktop-subject').getAttribute('data-truncated')).toBe('true')
  })

  it('gives a text alternative saying what is cut off', () => {
    render(<InboxPreview subject={SUBJECT_55} />)
    const caption = screen.getByText(/Mobile preview cuts off after/)
    expect(caption.textContent).toContain('Desktop preview shows the whole subject line.')
    expect(caption.textContent).toContain('Register to join | Navigating a rapidly')
  })
})

describe('sender and preheader (AC-18)', () => {
  it('shows skeleton bars when they are not provided', () => {
    render(<InboxPreview subject="Hello there" />)
    expect(screen.getByTestId('mobile-sender-skeleton')).toBeTruthy()
    expect(screen.getByTestId('mobile-preheader-skeleton')).toBeTruthy()
    expect(screen.queryByTestId('mobile-sender')).toBeNull()
  })

  it('replaces the bars with the text when they are provided', () => {
    render(<InboxPreview subject="Hello there" senderName="Ninety One" preheader="Read the full outlook" />)
    expect(screen.getByTestId('mobile-sender').textContent).toBe('Ninety One')
    expect(screen.getByTestId('mobile-preheader').textContent).toBe('Read the full outlook')
    expect(screen.queryByTestId('mobile-sender-skeleton')).toBeNull()
    expect(screen.queryByTestId('mobile-preheader-skeleton')).toBeNull()
  })

  it('treats blank text as not provided', () => {
    render(<InboxPreview subject="Hello there" senderName="   " preheader="" />)
    expect(screen.getByTestId('mobile-sender-skeleton')).toBeTruthy()
  })
})

describe('device toggle (AC-21)', () => {
  it('shows Both, then only Desktop, then only Mobile', async () => {
    const user = userEvent.setup({ delay: null })
    render(<InboxPreview subject="Hello there" />)
    const pressed = () => screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)
    expect(pressed()).toEqual(['Both'])
    await user.click(screen.getByRole('button', { name: 'Desktop' }))
    expect(screen.queryByTestId('desktop-preview')).toBeTruthy()
    expect(screen.queryByTestId('mobile-preview')).toBeNull()
    expect(pressed()).toEqual(['Desktop'])
    await user.click(screen.getByRole('button', { name: 'Mobile' }))
    expect(screen.queryByTestId('desktop-preview')).toBeNull()
    expect(screen.queryByTestId('mobile-preview')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Both' }))
    expect(screen.queryByTestId('desktop-preview')).toBeTruthy()
    expect(screen.queryByTestId('mobile-preview')).toBeTruthy()
  })
})

describe('inside the tester (AC-19)', () => {
  it('renders merge tags in the subject, sender and preheader as sample values', () => {
    vi.useFakeTimers()
    render(<SubjectLineTester initial={{ subject: 'Hi {{Recipient.FirstName}}, your Q4 outlook', senderName: '{{Recipient.Company}}', preheader: 'For {{Recipient.FirstName}}' }} />)
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByTestId('desktop-subject').textContent).toBe('Hi Alexandra, your Q4 outlook')
    expect(screen.getByTestId('mobile-sender').textContent).toBe('Acme Capital')
    expect(screen.getByTestId('mobile-preheader').textContent).toBe('For Alexandra')
    vi.useRealTimers()
  })

  it('can hide the preview', () => {
    render(<SubjectLineTester initial={{ subject: 'Hello there' }} showPreview={false} />)
    expect(screen.queryByTestId('desktop-preview')).toBeNull()
  })
})
