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
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Content', 'Calls to action', 'Media'])
    expect(screen.queryByText('Header with Image')).toBeNull()
    const ctas = screen.getByRole('list', { name: 'Calls to action' })
    expect(within(ctas).getAllByRole('button').length).toBe(2)
  })

  it('offers a filter for All and for each group, with how many modules each holds', () => {
    setup()
    const filters = within(screen.getByRole('group', { name: 'Show modules from' })).getAllByRole('button')
    expect(filters.map((b) => b.textContent)).toEqual(['All 4', 'Content 1', 'Calls to action 2', 'Media 1'])
    expect(filters[0].getAttribute('aria-pressed')).toBe('true')
  })

  it('shows only the chosen group, and All brings the rest back', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /^Calls to action/ }))
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Calls to action'])
    expect(screen.getByRole('button', { name: /^Calls to action/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Podcast Module')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Content', 'Calls to action', 'Media'])
  })

  it('a search narrows the filters too, and a group it empties is dropped rather than leaving a blank list', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /^Media/ }))
    fireEvent.change(screen.getByPlaceholderText('Search modules…'), { target: { value: 'cta' } })
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Calls to action'])
    expect(screen.queryByRole('group', { name: 'Show modules from' })).toBeNull()
  })

  it('uses the categories from Settings: their order, their names, and one added there', () => {
    const categories = [
      { id: 'Media', label: 'Audio & video' },
      { id: 'Promo', label: 'Promotions' },
      { id: 'Calls to action', label: 'Buttons' },
      { id: 'Content', label: 'Copy' },
      { id: 'Other', label: 'Other' },
    ]
    render(<ModulePicker names={[...NAMES, 'Promo Banner']} groups={{ 'Promo Banner': 'Promo' }} categories={categories} onPick={vi.fn()} onClose={() => {}} />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Audio & video', 'Promotions', 'Buttons', 'Copy'])
    expect(within(screen.getByRole('list', { name: 'Promotions' })).getByText('Promo Banner')).toBeTruthy()
    const filters = within(screen.getByRole('group', { name: 'Show modules from' })).getAllByRole('button').map((b) => b.textContent)
    expect(filters).toEqual(['All 5', 'Audio & video 1', 'Promotions 1', 'Buttons 2', 'Copy 1'])
  })

  it('a module filed in a category Settings has since deleted still appears, under Other', () => {
    render(<ModulePicker names={['Promo Banner']} groups={{ 'Promo Banner': 'Gone' }} categories={[{ id: 'Content', label: 'Content' }, { id: 'Other', label: 'Other' }]} onPick={vi.fn()} onClose={() => {}} />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Other'])
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
