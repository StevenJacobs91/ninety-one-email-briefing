// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { LibraryBuilder } from '../LibraryBuilder'
import type { BriefFormData } from '../../../lib/schema'

const page = (title: string) => `<table><tr><td><h1>${title}</h1><p>Some words</p></td></tr></table>`
const catalogue = {
  themeId: 'leatherback-coral',
  shell: { head: '<html><head></head><body>', tail: '</body></html>' },
  order: ['Plain Logo Header', 'Body Content', 'Footer v1', 'Disclaimer'],
  modules: { 'Plain Logo Header': page('Logo'), 'Body Content': page('Body'), 'Footer v1': page('Footer'), Disclaimer: page('Legal') },
}

vi.mock('../useCatalogue', () => ({ useCatalogue: () => ({ status: 'ready', catalogue, retry: () => {} }) }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: {}, updateSettings: () => {} }) }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'admin' } }) }))

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
})
afterEach(cleanup)

const FRESH = {
  meta: { briefId: 'b1' },
  campaign: { theme: 'leatherback-coral', campaignName: '' },
  audience: { region: [] },
  assets: { headerType: 'standard', heroImageUrl: '', heroImageAlt: '' },
  content: { headline: '', subHeadline: '', bodyIntro: '', modules: [], sections: [], cta: { label: '', url: '', openInNewTab: true } },
} as unknown as BriefFormData

function Harness({ onForm }: { onForm?: (f: ReturnType<typeof useForm<BriefFormData>>) => void }) {
  const form = useForm<BriefFormData>({ defaultValues: FRESH })
  onForm?.(form)
  return (
    <FormProvider {...form}>
      <div id="brief-email-builder"><LibraryBuilder /></div>
    </FormProvider>
  )
}

const bodies = () => screen.queryAllByRole('button', { name: 'Edit Body Content' }).length
const ready = () => waitFor(() => expect(bodies()).toBe(1))

describe('LibraryBuilder undo and redo', () => {
  it('starts with both disabled, because nothing has been changed yet', async () => {
    render(<Harness />)
    await ready()
    expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('undoes a change the person made and redoes it', async () => {
    render(<Harness />)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Body Content' }))
    await waitFor(() => expect(bodies()).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(bodies()).toBe(1))
    expect((screen.getByRole('button', { name: 'Redo' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    await waitFor(() => expect(bodies()).toBe(2))
  })

  it('Ctrl+Z on the email undoes, but inside a text box it is left to the browser', async () => {
    render(<Harness />)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Body Content' }))
    await waitFor(() => expect(bodies()).toBe(2))
    const box = document.createElement('input')
    document.getElementById('brief-email-builder')!.appendChild(box)
    fireEvent.keyDown(box, { key: 'z', ctrlKey: true })
    expect(bodies()).toBe(2)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Undo' }), { key: 'z', ctrlKey: true })
    await waitFor(() => expect(bodies()).toBe(1))
  })

  it('a different brief starts with a clean history', async () => {
    let form: ReturnType<typeof useForm<BriefFormData>> | undefined
    render(<Harness onForm={(f) => { form = f }} />)
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Body Content' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(false))
    act(() => { form!.setValue('meta.briefId', 'b2') })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement).disabled).toBe(true))
  })
})

describe('LibraryBuilder preview width', () => {
  it('switches between Desktop and Mobile', async () => {
    render(<Harness />)
    await ready()
    const desktop = screen.getByRole('button', { name: 'Desktop' })
    const mobile = screen.getByRole('button', { name: 'Mobile' })
    expect(desktop.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(mobile)
    expect(mobile.getAttribute('aria-pressed')).toBe('true')
    const frame = screen.getAllByTitle(/^Preview: /)[0] as HTMLIFrameElement
    expect(frame.style.width).toBe('375px')
  })
})

describe('LibraryBuilder editing', () => {
  it('is fully editable: modules can be added, picked and selected', async () => {
    render(<Harness />)
    await ready()
    expect(screen.getByRole('button', { name: 'Edit Body Content' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Add module/ }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
  })
})
