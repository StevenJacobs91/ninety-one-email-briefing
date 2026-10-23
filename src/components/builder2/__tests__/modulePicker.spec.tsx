// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModulePicker } from '../ModulePicker'

afterEach(cleanup)

const NAMES = ['Header with Image', 'Numbered Section V1', 'Podcast Module', 'Single Primary CTA', 'Primary and Secondary CTA']

function setup(onPick = vi.fn()) {
  render(<ModulePicker names={NAMES} onPick={onPick} onClose={() => {}} />)
  return onPick
}

describe('ModulePicker', () => {
  it('groups modules under headings and leaves out the fixed slots', () => {
    setup()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Content', 'Media', 'Calls to action'])
    expect(screen.queryByText('Header with Image')).toBeNull()
    const ctas = screen.getByRole('list', { name: 'Calls to action' })
    expect(within(ctas).getAllByRole('button').length).toBe(2)
  })

  it('describes each module in a line', () => {
    setup()
    expect(screen.getByText('One button')).toBeTruthy()
    expect(screen.getByText('2 buttons')).toBeTruthy()
  })

  it('picks a module by name', () => {
    const onPick = setup()
    fireEvent.click(screen.getByRole('button', { name: /Podcast Module/ }))
    expect(onPick).toHaveBeenCalledWith('Podcast Module')
  })

  it('search hides groups with no match, and says when nothing matches', () => {
    setup()
    fireEvent.change(screen.getByPlaceholderText('Search modules…'), { target: { value: 'cta' } })
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Calls to action'])
    fireEvent.change(screen.getByPlaceholderText('Search modules…'), { target: { value: 'zzz' } })
    expect(screen.getByText(/No module matches/)).toBeTruthy()
  })

  it('lists a module added in Settings under its category', () => {
    render(<ModulePicker names={[...NAMES, 'Promo Banner']} groups={{ 'Promo Banner': 'Events' }} onPick={vi.fn()} onClose={() => {}} />)
    expect(within(screen.getByRole('list', { name: 'Events' })).getByRole('button', { name: /Promo Banner/ })).toBeTruthy()
  })
})
