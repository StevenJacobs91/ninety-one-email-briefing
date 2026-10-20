// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpamWordListEditor } from '../components/SpamWordListEditor'
import type { LexiconTerm } from '../engine/types'

afterEach(cleanup)

const t = (term: string, pack = 'general-spam'): LexiconTerm => ({ term, severity: 'critical', pack })
const START = [t('free money'), t('cheap'), t('guaranteed returns', 'financial-promotions')]

function Harness({ initial = START, customised = true, onRestore = () => {} }: { initial?: LexiconTerm[]; customised?: boolean; onRestore?: () => void }) {
  const [list, setList] = useState(initial)
  return <SpamWordListEditor value={list} onChange={setList} customised={customised} onRestoreDefaults={onRestore} />
}

const terms = () => screen.getAllByRole('listitem').map((li) => li.textContent?.replace(/×$/, '').trim())

describe('SpamWordListEditor', () => {
  it('lists the terms grouped by pack with counts', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'General spam (2)' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Financial promotions (1)' })).toBeTruthy()
    expect(terms()).toEqual(['free money', 'cheap', 'guaranteed returns'])
  })

  it('filters the list as you search', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Search the word list'), 'guar')
    expect(terms()).toEqual(['guaranteed returns'])
    expect(screen.queryByRole('heading', { name: /General spam/ })).toBeNull()
  })

  it('adds a term with the button, to the chosen pack', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('New word or phrase'), '  click   here ')
    await user.selectOptions(screen.getByLabelText('Pack'), 'financial-promotions')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('heading', { name: 'Financial promotions (2)' })).toBeTruthy()
    expect(terms()).toContain('click here')
    expect((screen.getByLabelText('New word or phrase') as HTMLInputElement).value).toBe('')
  })

  it('adds a term when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('New word or phrase'), 'winner{Enter}')
    expect(terms()).toContain('winner')
  })

  it('says why a term cannot be added', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('New word or phrase'), 'FREE money{Enter}')
    expect((await screen.findByRole('alert')).textContent).toMatch(/already in the list/)
    expect(terms()).toHaveLength(3)
    await user.clear(screen.getByLabelText('New word or phrase'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Enter a word or phrase.')
  })

  it('removes a term', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Remove "cheap" from General spam' }))
    expect(terms()).toEqual(['free money', 'guaranteed returns'])
  })

  it('says when nothing matches the search', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByLabelText('Search the word list'), 'zzz')
    expect(screen.getByText('No words match your search.')).toBeTruthy()
  })

  it('offers "Restore defaults" only once the list has been customised, and asks first', async () => {
    const user = userEvent.setup()
    const onRestore = vi.fn()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { unmount } = render(<Harness customised={false} />)
    expect(screen.queryByRole('button', { name: 'Restore defaults' })).toBeNull()
    unmount()
    render(<Harness onRestore={onRestore} />)
    await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
    expect(onRestore).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Restore defaults' }))
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('shows how many words there are', () => {
    render(<Harness />)
    expect(within(screen.getByText(/3 words/).parentElement as HTMLElement).getByText(/3 words/)).toBeTruthy()
  })
})
