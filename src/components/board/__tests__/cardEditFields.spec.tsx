// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanCard } from '../../../types/kanban.types'

vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      brandThemes: [
        { id: 'agulhas-gold', label: 'Agulhas Indigo / Gazania Gold', primary: '#221b3b', accent: '#cf6f13' },
        { id: 'agulhas-teal', label: 'Agulhas Indigo / Ocean Teal', primary: '#221b3b', accent: '#009d80' },
      ],
      customRegions: [{ name: 'Kenya', clientGroup: 'Southern Africa' }],
      customChannels: [],
      customClientGroups: [],
    },
  }),
}))
vi.mock('../../builder2/useAvailableThemes', () => ({ useAvailableThemes: () => ({ ids: null, approximate: [] }) }))

import { CardEditFields, CopyTagsButton } from '../CardEditFields'

const card: KanbanCard = {
  id: 'c1', briefId: 'b1', emailName: 'Advisor Impact', emailType: 'operational', theme: 'agulhas-gold', subjectLine: 'Hello',
  region: ['South Africa'], channel: ['Advisor'], clientGroup: ['Southern Africa'], sendDate: '2026-09-30', contentApprovalDate: '2026-04-20',
  urgency: 'standard', column: 'briefed', submittedAt: '2026-10-20T08:00:00Z', columnHistory: [], notes: '', tags: 'parent - advisor impact, email - primary',
}

const onSave = vi.fn()
const setup = (over: Partial<React.ComponentProps<typeof CardEditFields>> = {}) =>
  render(<CardEditFields card={card} canEdit onSave={onSave} {...over} />)

beforeEach(() => { onSave.mockReset().mockResolvedValue({ ok: true }) })
afterEach(cleanup)

describe('editing a card\'s brief fields', () => {
  it('saves the subject line when the field is left, only if it changed', async () => {
    const user = userEvent.setup()
    setup()
    const input = screen.getByLabelText('Subject line')
    await user.click(input)
    await user.tab()
    expect(onSave).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, 'New subject')
    await user.tab()
    expect(onSave).toHaveBeenCalledWith({ subjectLine: 'New subject' })
  })

  it('saves a different brand theme as soon as it is chosen', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /Ocean Teal/ }))
    expect(onSave).toHaveBeenCalledWith({ theme: 'agulhas-teal' })
  })

  it('toggles regions, channels and client groups, with the team\'s own options included', async () => {
    const user = userEvent.setup()
    setup()
    const regions = screen.getByRole('group', { name: 'Regions' })
    expect(regions.querySelector('button[aria-pressed="true"]')?.textContent).toBe('South Africa')
    await user.click(screen.getByRole('button', { name: 'Kenya' }))
    expect(onSave).toHaveBeenLastCalledWith({ region: ['South Africa', 'Kenya'] })
    await user.click(screen.getByRole('button', { name: 'Institutional' }))
    expect(onSave).toHaveBeenLastCalledWith({ channel: ['Advisor', 'Institutional'] })
    await user.click(screen.getByRole('button', { name: 'Europe' }))
    expect(onSave).toHaveBeenLastCalledWith({ clientGroup: ['Southern Africa', 'Europe'] })
  })

  it('saves the dates when the field is left, and a cleared content approval date is allowed', () => {
    setup()
    const send = screen.getByLabelText('Send date')
    fireEvent.change(send, { target: { value: '2026-10-05' } })
    fireEvent.blur(send)
    expect(onSave).toHaveBeenLastCalledWith({ sendDate: '2026-10-05' })
    const approval = screen.getByLabelText('Content approval')
    fireEvent.change(approval, { target: { value: '' } })
    fireEvent.blur(approval)
    expect(onSave).toHaveBeenLastCalledWith({ contentApprovalDate: '' })
  })

  it('edits the tags, and Copy tags puts what is in the box on the clipboard', async () => {
    const user = userEvent.setup()
    setup()
    const tags = screen.getByLabelText('Tags')
    await user.clear(tags)
    await user.type(tags, 'one, two')
    await user.tab()
    expect(onSave).toHaveBeenLastCalledWith({ tags: 'one, two' })
    await user.click(screen.getByRole('button', { name: 'Copy tags' }))
    expect(await navigator.clipboard.readText()).toBe('one, two')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
  })

  it('says why a change was refused and puts the field back as it was', async () => {
    const user = userEvent.setup()
    onSave.mockResolvedValue({ ok: false, error: 'The subject line cannot be empty.' })
    setup()
    const input = screen.getByLabelText('Subject line') as HTMLInputElement
    await user.clear(input)
    await user.tab()
    expect((await screen.findByRole('alert')).textContent).toContain('The subject line cannot be empty.')
    expect(input.value).toBe('Hello')
  })

  it('warns that an approved brief will be marked out of date, only when it has been through approval', () => {
    const { rerender } = setup()
    expect(screen.queryByText(/out of date/i)).toBeNull()
    rerender(<CardEditFields card={card} canEdit onSave={onSave} approvalNote />)
    expect(screen.getByText(/out of date/i)).toBeTruthy()
  })

  it('shows the values without inputs to someone who cannot edit, who can still copy the tags', () => {
    setup({ canEdit: false })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText('Hello')).toBeTruthy()
    expect(screen.getByText('South Africa')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy tags' })).toBeTruthy()
  })
})

describe('Copy tags', () => {
  it('is left out when there are no tags', () => {
    render(<CopyTagsButton tags="" />)
    expect(screen.queryByRole('button', { name: 'Copy tags' })).toBeNull()
  })
})
