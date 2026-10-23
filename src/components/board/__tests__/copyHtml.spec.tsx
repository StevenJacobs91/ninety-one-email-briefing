// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyHtml } from '../CopyHtml'

const writeText = vi.fn()

beforeEach(() => {
  writeText.mockReset()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

const ready = { status: 'ready' as const, html: '<html><body>Hello</body></html>' }

describe('CopyHtml', () => {
  it('copies the email\'s HTML and says so', async () => {
    render(<CopyHtml email={ready} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy HTML' })) })
    expect(writeText).toHaveBeenCalledWith('<html><body>Hello</body></html>')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('goes back to "Copy HTML" after a moment', async () => {
    vi.useFakeTimers()
    render(<CopyHtml email={ready} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy HTML' })) })
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    act(() => { vi.advanceTimersByTime(2500) })
    expect(screen.getByRole('button', { name: 'Copy HTML' })).toBeTruthy()
  })

  it('is disabled until the email is ready', () => {
    render(<CopyHtml email={{ status: 'loading' }} />)
    const button = screen.getByRole('button', { name: 'Copy HTML' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('says when the browser would not copy it', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    render(<CopyHtml email={ready} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy HTML' })) })
    expect(screen.getByRole('alert').textContent).toMatch(/could not copy/i)
  })
})
