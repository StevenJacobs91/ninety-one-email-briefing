// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ show: vi.fn() }))

vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn() }) }))
vi.mock('../../../lib/supabaseQueries', () => ({ fetchShowSignUp: state.show }))

import { LoginPage } from '../LoginPage'

beforeEach(() => { state.show.mockReset() })
afterEach(cleanup)

describe('the sign-in page\'s sign-up link', () => {
  it('is shown when the team has it switched on', async () => {
    state.show.mockResolvedValue(true)
    render(<LoginPage />)
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeTruthy()
  })

  it('is left off when the team has switched it off, and the sign-in form is still there', async () => {
    state.show.mockResolvedValue(false)
    render(<LoginPage />)
    await waitFor(() => expect(state.show).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull()
    expect(screen.queryByText(/Don't have an account/)).toBeNull()
  })

  it('is not shown for a moment and then taken away: it waits for the answer', () => {
    state.show.mockReturnValue(new Promise(() => {}))
    render(<LoginPage />)
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull()
  })

  it('is shown when the answer cannot be read, so a failed lookup never locks anyone out of signing up', async () => {
    state.show.mockImplementation(() => Promise.reject(new Error('network')))
    render(<LoginPage />)
    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeTruthy()
  })
})
