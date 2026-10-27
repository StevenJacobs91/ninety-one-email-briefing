// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StartNewBriefDialog } from '../StartNewBriefDialog'

afterEach(cleanup)

describe('the start new brief dialog', () => {
  it('says what will be cleared and what will not', () => {
    render(<StartNewBriefDialog onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText(/clears the brief and the email you are building/)).toBeTruthy()
    expect(screen.getByText(/already submitted and drafts you saved are not affected/)).toBeTruthy()
  })

  it('starts the new brief only when confirmed', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<StartNewBriefDialog onConfirm={onConfirm} onCancel={onCancel} />)
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start new brief' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('keeps focus on Cancel, so pressing Enter never discards the brief', () => {
    render(<StartNewBriefDialog onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  })

  it('cancels on the Cancel button, on Escape and on a click outside', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const { container } = render(<StartNewBriefDialog onConfirm={onConfirm} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(container.querySelector('[aria-hidden="true"]') as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
