// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SetPasswordForm } from '../SetPasswordForm'

afterEach(cleanup)

function setup(onSubmit: (password: string) => Promise<void> = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn()
  render(<SetPasswordForm name="Katie Tredoux" email="katie@ninetyone.com" onSubmit={onSubmit} onCancel={onCancel} />)
  const field = screen.getByLabelText('New password for Katie Tredoux') as HTMLInputElement
  const type = (value: string) => fireEvent.change(field, { target: { value } })
  return { field, type, onSubmit, onCancel }
}

describe('SetPasswordForm', () => {
  it('asks for the new password, hidden until Show is pressed', () => {
    const { field } = setup()
    expect(field.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(field.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(field.type).toBe('password')
  })

  it('will not set a password that is too short, and says so', () => {
    const { type, onSubmit } = setup()
    type('abc')
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    expect(screen.getByRole('alert').textContent).toMatch(/at least 6 characters/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sets the password and confirms it, clearing the box', async () => {
    const { field, type, onSubmit } = setup()
    type('a-new-password')
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Password updated for Katie Tredoux/))
    expect(onSubmit).toHaveBeenCalledWith('a-new-password')
    expect(field.value).toBe('')
  })

  it('shows why the password could not be set', async () => {
    const { type } = setup(vi.fn().mockRejectedValue(new Error('Password should be at least 8 characters.')))
    type('abcdefg')
    fireEvent.click(screen.getByRole('button', { name: 'Set password' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Password should be at least 8 characters.')
  })

  it('sets the password when Enter is pressed, and closes with Close', async () => {
    const { field, type, onSubmit, onCancel } = setup()
    type('another-password')
    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('another-password'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
