// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, BrandThemeConfig } from '../../types/settings.types'

const queries = vi.hoisted(() => ({ fetchSettings: vi.fn(), upsertSettings: vi.fn() }))
vi.mock('../supabaseQueries', () => queries)
const auth = vi.hoisted(() => ({ value: { profile: { teamId: 't1' } } }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))

import { createDefaultSettings } from '../settingsDefaults'
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext'

let update: (patch: Partial<AppSettings>) => void = () => {}
function Probe() {
  update = useSettings().updateSettings
  return null
}

const defaults = createDefaultSettings()
const themeIds = defaults.brandThemes.map((t) => t.id)
const withUrls = (urls: Record<string, Partial<BrandThemeConfig>>): AppSettings => ({
  ...defaults,
  brandThemes: defaults.brandThemes.map((t) => ({ ...t, ...(urls[t.id] ?? {}) })),
})
const urlOf = (settings: AppSettings, id: string) => settings.brandThemes.find((t) => t.id === id)?.slimStripeUrl

async function mount() {
  render(<SettingsProvider><Probe /></SettingsProvider>)
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
}
const edit = async () => {
  await act(async () => { update({ senderDefaults: { ...defaults.senderDefaults, fromName: 'Changed' } }) })
  await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
}

beforeEach(() => {
  vi.useFakeTimers()
  queries.fetchSettings.mockReset()
  queries.upsertSettings.mockReset().mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('saving settings', () => {
  it('keeps what was saved for each theme when something else is changed', async () => {
    const stored = withUrls({ [themeIds[0]]: { slimStripeUrl: 'https://x/a.png' }, [themeIds[1]]: { slimStripeUrl: 'https://x/b.png' } })
    queries.fetchSettings.mockResolvedValue(stored)
    await mount()
    await edit()
    expect(queries.upsertSettings).toHaveBeenCalledTimes(1)
    const saved = queries.upsertSettings.mock.calls[0][1] as AppSettings
    expect(urlOf(saved, themeIds[0])).toBe('https://x/a.png')
    expect(urlOf(saved, themeIds[1])).toBe('https://x/b.png')
  })

  it('never saves when the settings could not be loaded, so built-in defaults cannot overwrite the team’s', async () => {
    queries.fetchSettings.mockRejectedValue(new Error('network down'))
    await mount()
    await edit()
    expect(queries.upsertSettings).not.toHaveBeenCalled()
  })

  it('does not save before the first load has finished', async () => {
    let finish: (s: AppSettings) => void = () => {}
    queries.fetchSettings.mockReturnValueOnce(new Promise<AppSettings>((resolve) => { finish = resolve }))
    await mount()
    await edit()
    expect(queries.upsertSettings).not.toHaveBeenCalled()
    finish(withUrls({ [themeIds[0]]: { slimStripeUrl: 'https://x/a.png' } }))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  })

  it('saves for a team that has no settings yet', async () => {
    queries.fetchSettings.mockResolvedValue(null)
    await mount()
    await edit()
    expect(queries.upsertSettings).toHaveBeenCalledTimes(1)
  })

  it('keeps a URL saved by someone else since this session loaded, instead of overwriting it with an empty one', async () => {
    queries.fetchSettings
      .mockResolvedValueOnce(withUrls({}))
      .mockResolvedValue(withUrls({ [themeIds[2]]: { slimStripeUrl: 'https://x/saved-elsewhere.png' } }))
    await mount()
    await edit()
    const saved = queries.upsertSettings.mock.calls[0][1] as AppSettings
    expect(urlOf(saved, themeIds[2])).toBe('https://x/saved-elsewhere.png')
  })

  it('still lets a URL be cleared on purpose', async () => {
    const stored = withUrls({ [themeIds[0]]: { slimStripeUrl: 'https://x/a.png' } })
    queries.fetchSettings.mockResolvedValue(stored)
    await mount()
    await act(async () => { update({ brandThemes: stored.brandThemes.map((t) => (t.id === themeIds[0] ? { ...t, slimStripeUrl: '' } : t)) }) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    const saved = queries.upsertSettings.mock.calls[0][1] as AppSettings
    expect(urlOf(saved, themeIds[0])).toBe('')
  })

  it('does not save when what is stored cannot be checked first', async () => {
    queries.fetchSettings.mockResolvedValueOnce(withUrls({})).mockRejectedValue(new Error('blip'))
    await mount()
    await edit()
    expect(queries.upsertSettings).not.toHaveBeenCalled()
  })
})
