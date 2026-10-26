// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, updateSettings: vi.fn() }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: state.updateSettings }) }))

// The real editor is CodeMirror, loaded on demand; these tests are about what the form does with the code, so a textarea stands in.
vi.mock('../../ui/LazyCodeEditor', async () => {
  const React = await import('react')
  return {
    LazyCodeEditor: ({ value, onChange, label, invalid, placeholder }: { value: string; onChange: (v: string) => void; label: string; invalid?: boolean; placeholder?: string }) =>
      React.createElement('textarea', { 'aria-label': label, 'aria-invalid': invalid || undefined, placeholder, value, onChange: (e: { target: { value: string } }) => onChange(e.target.value) }),
  }
})

// The library the built-in modules' code comes from: one module, in Agulhas Gold's own colours.
vi.mock('../../../lib/moduleEngine/catalogue', () => ({
  loadCatalogue: () => Promise.resolve({ themeId: 'agulhas-gold', order: ['Speakers'], shell: { head: '', tail: '' }, modules: { Speakers: '<tr><td bgcolor="#221b3b" style="color:#cf6f13">Speakers</td></tr>' } }),
}))
const LIBRARY_SPEAKERS = '<tr><td bgcolor="{{primary}}" style="color:{{accent}}">Speakers</td></tr>'

import { TabModules } from '../TabModules'

const ROW = '<tr><td bgcolor="{{primary}}">Hello</td></tr>'

beforeEach(() => {
  state.updateSettings.mockClear()
  state.settings = {
    brandThemes: [{ id: 'agulhas-gold', primary: '#221b3b', accent: '#cf6f13' }],
    htmlModules: [
      { id: 'speakers', label: 'Speakers', description: 'Speaker photos', category: 'Speakers', enabled: true },
      { id: 'promo', label: 'Promo Banner', description: 'A banner', category: 'Content', enabled: true, html: ROW },
    ],
  }
})
afterEach(cleanup)

const saved = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0].htmlModules
const code = () => screen.getByLabelText(/Module code/) as HTMLTextAreaElement

// The list is grouped by category, so find a module's Edit button by its name.
const editButton = (label: string) => screen.getByText(label, { selector: 'p' }).closest('.group')!.querySelector('button[title="Edit"]') as HTMLElement

function fillNew(html: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
  fireEvent.change(screen.getByPlaceholderText(/my-custom-module/), { target: { value: 'new-one' } })
  fireEvent.change(screen.getByPlaceholderText('Module display name'), { target: { value: 'New One' } })
  fireEvent.change(code(), { target: { value: html } })
}

describe('Email Modules: module code', () => {
  it('has a code box when adding a module, with a hint about table rows, regions and theme colours', () => {
    render(<TabModules />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
    expect(code()).toBeTruthy()
    expect(screen.getByText(/pardot-region/)).toBeTruthy()
    expect(screen.getByText('{{primary}}')).toBeTruthy()
  })

  describe('categories', () => {
    const lastUpdate = () => state.updateSettings.mock.calls[state.updateSettings.mock.calls.length - 1][0]
    const manage = () => fireEvent.click(screen.getByRole('button', { name: 'Manage categories' }))

    it('files a module saved under an old category name where the list now has it, with the shared names', () => {
      render(<TabModules />)
      // 'Speakers' was the old name of People
      expect(screen.getByRole('button', { name: /^People \(1\)/ })).toBeTruthy()
      expect(screen.getByRole('heading', { level: 4, name: 'People' })).toBeTruthy()
      expect(screen.queryByRole('heading', { level: 4, name: 'Speakers' })).toBeNull()
    })

    it('offers the categories from the list when adding a module', () => {
      render(<TabModules />)
      fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
      const options = Array.from((screen.getByRole('combobox') as HTMLSelectElement).options).map((o) => o.textContent)
      expect(options).toEqual(['Headers', 'Content', 'Calls to action', 'Events', 'People', 'Articles', 'Media', 'Navigation', 'Legal', 'Footers', 'Other'])
    })

    it('renames a category without changing what is filed under it', () => {
      render(<TabModules />)
      manage()
      const input = screen.getByLabelText('Name of the Content category')
      fireEvent.change(input, { target: { value: 'Copy' } })
      fireEvent.blur(input)
      const list = lastUpdate().moduleCategories as { id: string; label: string }[]
      expect(list.find((c) => c.id === 'Content')).toEqual({ id: 'Content', label: 'Copy' })
      expect(lastUpdate().htmlModules).toBeUndefined()
    })

    it('adds a category before Other, and rejects an empty or repeated name', () => {
      render(<TabModules />)
      manage()
      fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
      expect(screen.getByRole('alert').textContent).toMatch(/Give the category a name/)
      fireEvent.change(screen.getByLabelText('New category name'), { target: { value: 'content' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
      expect(screen.getByRole('alert').textContent).toMatch(/already a category called "content"/)
      expect(state.updateSettings).not.toHaveBeenCalled()
      fireEvent.change(screen.getByLabelText('New category name'), { target: { value: 'Promotions' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
      const ids = (lastUpdate().moduleCategories as { id: string }[]).map((c) => c.id)
      expect(ids.slice(-2)).toEqual(['Promotions', 'Other'])
    })

    it('moves a category up or down, but never past Other', () => {
      render(<TabModules />)
      manage()
      fireEvent.click(screen.getByRole('button', { name: 'Move Content up' }))
      const ids = (lastUpdate().moduleCategories as { id: string }[]).map((c) => c.id)
      expect(ids.slice(0, 2)).toEqual(['Content', 'Headers'])
      expect((screen.getByRole('button', { name: 'Move Footers down' }) as HTMLButtonElement).disabled).toBe(true)
      expect(screen.queryByRole('button', { name: /Delete the Other category/ })).toBeNull()
      expect(ids[ids.length - 1]).toBe('Other')
    })

    it('deleting a category asks first, then moves its modules to Other', () => {
      render(<TabModules />)
      manage()
      fireEvent.click(screen.getByRole('button', { name: 'Delete the People category' }))
      expect(state.updateSettings).not.toHaveBeenCalled()
      expect(screen.getByRole('group', { name: 'Delete People?' }).textContent).toContain('1 to Other')
      fireEvent.click(within(screen.getByRole('group', { name: 'Delete People?' })).getByRole('button', { name: 'Delete' }))
      const update = lastUpdate()
      expect((update.moduleCategories as { id: string }[]).some((c) => c.id === 'People')).toBe(false)
      expect(update.htmlModules.find((m: { id: string }) => m.id === 'speakers').category).toBe('Other')
      expect(update.htmlModules.find((m: { id: string }) => m.id === 'promo').category).toBe('Content')
    })
  })

  it('asks before removing a module, and only the second click removes it', () => {
    render(<TabModules />)
    const row = () => screen.getByText('Promo Banner', { selector: 'p' }).closest('.group') as HTMLElement
    fireEvent.click(row().querySelector('button[title="Remove"]') as HTMLElement)
    expect(state.updateSettings).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Remove Promo Banner?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(saved().some((m: { id: string }) => m.id === 'promo')).toBe(false)
    expect(saved().some((m: { id: string }) => m.id === 'speakers')).toBe(true)
  })

  it('Cancel leaves the module alone and puts the remove button back', () => {
    render(<TabModules />)
    const row = () => screen.getByText('Promo Banner', { selector: 'p' }).closest('.group') as HTMLElement
    fireEvent.click(row().querySelector('button[title="Remove"]') as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(state.updateSettings).not.toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: /Remove Promo Banner/ })).toBeNull()
    expect(row().querySelector('button[title="Remove"]')).toBeTruthy()
  })

  it('lets a layout icon be chosen for a new module, and saves it', () => {
    render(<TabModules />)
    fillNew(ROW)
    const group = screen.getByRole('radiogroup', { name: 'Layout icon' })
    expect(Array.from(group.querySelectorAll('input')).map((i) => i.getAttribute('aria-label')).slice(0, 4)).toEqual(['Auto', 'Text', '2 columns', '3 columns'])
    expect((screen.getByRole('radio', { name: 'Auto' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Image left' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(saved().find((m: { id: string }) => m.id === 'new-one').layoutIcon).toBe('imageLeft')
  })

  it('shows a module\'s saved layout icon when editing, and Auto clears it', () => {
    state.settings = { ...state.settings, htmlModules: [{ id: 'promo', label: 'Promo Banner', description: '', category: 'Content', enabled: true, html: ROW, layoutIcon: 'quote' }] }
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    expect((screen.getByRole('radio', { name: 'Quote' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Auto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(saved().find((m: { id: string }) => m.id === 'promo').layoutIcon).toBeUndefined()
  })

  it('saves the code with a new module', () => {
    render(<TabModules />)
    fillNew(`\n  ${ROW}\n`)
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(saved().find((m: { id: string }) => m.id === 'new-one').html).toBe(ROW)
  })

  it('makes the ID from the label when none is typed, rather than silently doing nothing', () => {
    render(<TabModules />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
    fireEvent.change(screen.getByPlaceholderText('Module display name'), { target: { value: 'Big Quote!' } })
    fireEvent.change(code(), { target: { value: ROW } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(saved().some((m: { id: string }) => m.id === 'big-quote')).toBe(true)
  })

  it('says why when the label is missing or the ID is already taken', () => {
    render(<TabModules />)
    fireEvent.click(screen.getByRole('button', { name: '+ Add Module' }))
    fireEvent.change(code(), { target: { value: ROW } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toBe('Give the module a label.')
    fireEvent.change(screen.getByPlaceholderText('Module display name'), { target: { value: 'Promo' } })
    fireEvent.change(screen.getByPlaceholderText(/my-custom-module/), { target: { value: 'promo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toMatch(/already exists/)
    expect(state.updateSettings).not.toHaveBeenCalled()
  })

  it('will not add a module with no code, or with code that is not a table row, and says why', () => {
    render(<TabModules />)
    fillNew('')
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toBe('Paste the module\'s HTML.')
    expect(state.updateSettings).not.toHaveBeenCalled()
    fireEvent.change(code(), { target: { value: '<p>Hi</p>' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toMatch(/start with <tr>/)
    fireEvent.change(code(), { target: { value: '<tr><td><script>x()</script></td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Module' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Scripts are not allowed/)
    expect(state.updateSettings).not.toHaveBeenCalled()
  })

  it('shows the code of a module that has some when editing, and saves a change to it', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    expect(code().value).toBe(ROW)
    fireEvent.change(code(), { target: { value: '<tr><td>Changed</td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(saved().find((m: { id: string }) => m.id === 'promo').html).toBe('<tr><td>Changed</td></tr>')
  })

  it('a built-in module shows the library\'s own code with variables for the theme, and saving it unchanged keeps it the library\'s', async () => {
    render(<TabModules />)
    fireEvent.click(editButton('Speakers'))
    await waitFor(() => expect(code().value).toBe(LIBRARY_SPEAKERS))
    expect(screen.getByText(/This is the library's own code/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Reset to the library/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect('html' in saved().find((m: { id: string }) => m.id === 'speakers')).toBe(false)
  })

  it('the library\'s code can be edited and saved as the module\'s own, and reset to the library\'s', async () => {
    render(<TabModules />)
    fireEvent.click(editButton('Speakers'))
    await waitFor(() => expect(code().value).toBe(LIBRARY_SPEAKERS))
    fireEvent.change(code(), { target: { value: LIBRARY_SPEAKERS.replace('Speakers', 'Our speakers') } })
    expect(screen.getByRole('button', { name: /Reset to the library/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reset to the library/ }))
    expect(code().value).toBe(LIBRARY_SPEAKERS)
    fireEvent.change(code(), { target: { value: '<tr><td>Mine</td></tr>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(saved().find((m: { id: string }) => m.id === 'speakers').html).toBe('<tr><td>Mine</td></tr>')
  })

  it('a library module keeps its name, so the builder and Settings stay one module', async () => {
    render(<TabModules />)
    fireEvent.click(editButton('Speakers'))
    expect((screen.getByPlaceholderText('Module display name') as HTMLInputElement).disabled).toBe(true)
    cleanup()
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    expect((screen.getByPlaceholderText('Module display name') as HTMLInputElement).disabled).toBe(false)
  })

  it('clearing the code of a custom module on edit takes it out of the builder\'s library', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    fireEvent.change(code(), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect('html' in saved().find((m: { id: string }) => m.id === 'promo')).toBe(false)
  })

  it('previews the code in the theme\'s colours, in a sandbox that cannot run anything', () => {
    render(<TabModules />)
    fireEvent.click(editButton('Promo Banner'))
    fireEvent.click(screen.getByRole('button', { name: 'Show preview' }))
    const frame = screen.getByTitle('Module preview') as HTMLIFrameElement
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toContain('bgcolor="#221b3b"')
  })
})
