// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CustomRole } from '../../../types/settings.types'
import { CustomRolesManager } from '../CustomRolesManager'

afterEach(cleanup)

const reviewer: CustomRole = { id: 'campaign-reviewer', name: 'Campaign reviewer', colour: '#134848', baseRole: 'requester', opensOn: 'board' }

function setup(roles: CustomRole[] = [], counts: Record<string, number> = {}) {
  const onChange = vi.fn()
  render(<CustomRolesManager roles={roles} memberCounts={counts} onChange={onChange} />)
  return onChange
}

describe('CustomRolesManager', () => {
  it('says there are no custom roles yet', () => {
    setup()
    expect(screen.getByText(/No custom roles yet/)).toBeTruthy()
  })

  it('adds a role that works like a chosen role and opens on the board', () => {
    const onChange = setup()
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Campaign reviewer' } })
    fireEvent.change(screen.getByLabelText('Works like'), { target: { value: 'requester' } })
    fireEvent.change(screen.getByLabelText('Opens on'), { target: { value: 'board' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toEqual([expect.objectContaining({ id: 'campaign-reviewer', name: 'Campaign reviewer', baseRole: 'requester', opensOn: 'board' })])
  })

  it('refuses a blank name or a built-in role\'s name', () => {
    const onChange = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
    expect(screen.getByRole('alert').textContent).toBe('Give the role a name.')
    fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Producer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }))
    expect(screen.getByRole('alert').textContent).toBe('There is already a role called Producer.')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lists each role with what it works like and where it opens, and how many people hold it', () => {
    setup([reviewer], { 'campaign-reviewer': 2 })
    expect(screen.getByText('Campaign reviewer')).toBeTruthy()
    expect(screen.getByText(/Works like Requester/)).toBeTruthy()
    expect(screen.getByText(/Opens on the Campaign Board/)).toBeTruthy()
    expect(screen.getByText('2 people')).toBeTruthy()
  })

  it('deletes a role after confirming, and says people keep their base role', () => {
    const onChange = setup([reviewer], { 'campaign-reviewer': 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign reviewer' }))
    expect(screen.getByText(/keep working as Requester/)).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
