// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BriefPayload } from '../../../types/brief.types'

const m = vi.hoisted(() => ({ fetchBriefById: vi.fn(), generateEmailHtml: vi.fn(), loadCatalogue: vi.fn() }))

vi.mock('../../../lib/supabaseQueries', () => ({ fetchBriefById: m.fetchBriefById }))
vi.mock('../../../lib/emailGenerator', () => ({ generateEmailHtml: m.generateEmailHtml }))
vi.mock('../../../lib/moduleEngine/catalogue', () => ({ loadCatalogue: m.loadCatalogue }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { marker: 'settings' } }) }))

import { useCardEmail } from '../useCardEmail'

const brief = (build = false): BriefPayload => ({
  meta: { briefId: 'b1' }, campaign: { theme: 'agulhas-gold', campaignName: 'Advisor Impact' },
  content: build ? { build: { version: 1, themeId: 'agulhas-gold', modules: [] } } : {},
} as unknown as BriefPayload)
const CATALOGUE = { themeId: 'agulhas-gold', shell: { head: '', tail: '' }, order: [], modules: {} }

beforeEach(() => {
  m.fetchBriefById.mockReset()
  m.generateEmailHtml.mockReset().mockReturnValue('<html>THE EMAIL</html>')
  m.loadCatalogue.mockReset().mockResolvedValue(CATALOGUE)
})

describe('useCardEmail', () => {
  it('loads the card\'s brief and builds its email', async () => {
    m.fetchBriefById.mockResolvedValue(brief(true))
    const { result } = renderHook(() => useCardEmail('b1'))
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current).toEqual({ status: 'ready', html: '<html>THE EMAIL</html>' })
    expect(m.fetchBriefById).toHaveBeenCalledWith('b1')
    expect(m.loadCatalogue).toHaveBeenCalledWith('agulhas-gold')
    expect(m.generateEmailHtml).toHaveBeenCalledWith(expect.anything(), { marker: 'settings' }, { catalogue: CATALOGUE })
  })

  it('reports a card with no saved brief', async () => {
    m.fetchBriefById.mockResolvedValue(null)
    const { result } = renderHook(() => useCardEmail('manual'))
    await waitFor(() => expect(result.current.status).toBe('missing'))
    expect(m.generateEmailHtml).not.toHaveBeenCalled()
  })

  it('reports a failure to load the brief, with the reason', async () => {
    m.fetchBriefById.mockRejectedValue(new Error('Network down'))
    const { result } = renderHook(() => useCardEmail('b1'))
    await waitFor(() => expect(result.current).toEqual({ status: 'error', message: 'Network down' }))
  })

  it('shows that the module library is loading before the email can be built', async () => {
    let release: (c: typeof CATALOGUE) => void = () => {}
    m.loadCatalogue.mockReturnValue(new Promise((resolve) => { release = resolve }))
    m.fetchBriefById.mockResolvedValue(brief(true))
    const { result } = renderHook(() => useCardEmail('b1'))
    await waitFor(() => expect(result.current.status).toBe('loading-library'))
    expect(m.generateEmailHtml).not.toHaveBeenCalled()
    await act(async () => release(CATALOGUE))
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('reports a library failure and can try again', async () => {
    m.loadCatalogue.mockRejectedValueOnce(new Error('No module library for this theme'))
    m.fetchBriefById.mockResolvedValue(brief(true))
    const { result } = renderHook(() => useCardEmail('b1'))
    await waitFor(() => expect(result.current.status).toBe('library-error'))
    expect((result.current as { message: string }).message).toBe('No module library for this theme')
    act(() => (result.current as { retry: () => void }).retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(m.loadCatalogue).toHaveBeenCalledTimes(2)
  })

  it('does not fetch a library for an older brief that was not built from one', async () => {
    m.fetchBriefById.mockResolvedValue(brief(false))
    const { result } = renderHook(() => useCardEmail('b1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(m.loadCatalogue).not.toHaveBeenCalled()
    expect(m.generateEmailHtml).toHaveBeenCalledWith(expect.anything(), expect.anything(), { catalogue: undefined })
  })

  it('reports an email that cannot be built instead of throwing', async () => {
    m.fetchBriefById.mockResolvedValue(brief(false))
    m.generateEmailHtml.mockImplementation(() => { throw new Error('bad module') })
    const { result } = renderHook(() => useCardEmail('b1'))
    await waitFor(() => expect(result.current.status).toBe('unbuildable'))
  })

  it('starts over for a different card', async () => {
    m.fetchBriefById.mockResolvedValue(brief(false))
    const { result, rerender } = renderHook(({ id }) => useCardEmail(id), { initialProps: { id: 'b1' } })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    rerender({ id: 'b2' })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(m.fetchBriefById).toHaveBeenCalledWith('b2'))
  })
})
