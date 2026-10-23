// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetAllSettings } from '../ResetAllSettings'

afterEach(cleanup)

function setup() {
  const onReset = vi.fn()
  render(<ResetAllSettings onReset={onReset} />)
  return onReset
}

describe('ResetAllSettings', () => {
  it('does nothing until it has been confirmed twice', () => {
    const onReset = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Reset all settings…' }))
    expect(onReset).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, continue' }))
    expect(onReset).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Reset everything' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'reset' } })
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'RESET' } })
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('can be cancelled at either step and starts again from the top', () => {
    const onReset = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Reset all settings…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Reset all settings…' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset all settings…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, continue' }))
    fireEvent.change(screen.getByLabelText('Type RESET to confirm'), { target: { value: 'RESET' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset all settings…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, continue' }))
    expect((screen.getByLabelText('Type RESET to confirm') as HTMLInputElement).value).toBe('')
    expect(onReset).not.toHaveBeenCalled()
  })
})
