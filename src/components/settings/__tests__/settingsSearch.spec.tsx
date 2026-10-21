// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => ({ settings: state.settings, updateSettings: vi.fn() }) }))

import { TabCampaigns } from '../TabCampaigns'
import { TabAssets } from '../TabAssets'

const camp = (id: string, name: string, over: Record<string, unknown> = {}) => ({ id, name, regions: [], channels: [], clientGroups: [], ...over })
const asset = (id: string, name: string, category: string, over: Record<string, unknown> = {}) => ({ id, name, url: `https://cdn.test/${name}.jpg`, category, ...over })

beforeEach(() => {
  state.settings = {
    campaigns: [
      camp('1', 'Quarterly Market Update'),
      camp('2', 'SA Intermediary Newsletter', { channels: ['Intermediary'] }),
      camp('3', 'Taking Stock', { regions: ['Southern Africa'], pardotCampaignId: '139848' }),
    ],
    assets: [
      asset('a', '706930897', 'header', { altText: 'Ninety One header 706930897' }),
      asset('b', 'elephants-640', 'graphics', { altText: 'Elephants crossing' }),
      asset('c', 'elephants-800', 'graphics'),
    ],
    signoffs: [], legalDisclaimers: [],
  }
})
afterEach(cleanup)

describe('Campaigns search', () => {
  const names = () => screen.queryAllByText(/Quarterly Market Update|SA Intermediary Newsletter|Taking Stock/).map((e) => e.textContent)

  it('lists every campaign until something is typed', () => {
    render(<TabCampaigns />)
    expect(names()).toEqual(['Quarterly Market Update', 'SA Intermediary Newsletter', 'Taking Stock'])
  })

  it('narrows the list as you type, by name or by audience', async () => {
    const user = userEvent.setup()
    render(<TabCampaigns />)
    await user.type(screen.getByRole('searchbox', { name: 'Search campaigns' }), 'intermediary')
    expect(names()).toEqual(['SA Intermediary Newsletter'])
    await user.clear(screen.getByRole('searchbox', { name: 'Search campaigns' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search campaigns' }), 'southern')
    expect(names()).toEqual(['Taking Stock'])
  })

  it('finds a campaign by its Pardot id', async () => {
    const user = userEvent.setup()
    render(<TabCampaigns />)
    await user.type(screen.getByRole('searchbox', { name: 'Search campaigns' }), '139848')
    expect(names()).toEqual(['Taking Stock'])
  })

  it('says how many match, and offers to show everything again when none do', async () => {
    const user = userEvent.setup()
    render(<TabCampaigns />)
    const box = screen.getByRole('searchbox', { name: 'Search campaigns' })
    await user.type(box, 'market')
    expect(screen.getByText('1 of 3 campaigns')).toBeTruthy()
    await user.clear(box)
    await user.type(box, 'zzz')
    expect(screen.getByText(/No campaigns match/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Show all campaigns' }))
    expect(names().length).toBe(3)
    expect((box as HTMLInputElement).value).toBe('')
  })

  it('clears with the Escape key', async () => {
    const user = userEvent.setup()
    render(<TabCampaigns />)
    const box = screen.getByRole('searchbox', { name: 'Search campaigns' })
    await user.type(box, 'tak')
    await user.keyboard('{Escape}')
    expect((box as HTMLInputElement).value).toBe('')
  })
})

describe('Asset Library search', () => {
  const cards = () => screen.queryAllByText(/^(706930897|elephants-640|elephants-800)$/).map((e) => e.textContent)

  it('shows every asset until something is typed', () => {
    render(<TabAssets />)
    expect(cards().sort()).toEqual(['706930897', 'elephants-640', 'elephants-800'])
  })

  it('narrows by name and by alt text', async () => {
    const user = userEvent.setup()
    render(<TabAssets />)
    const box = screen.getByRole('searchbox', { name: 'Search assets' })
    await user.type(box, 'elephants')
    expect(cards().sort()).toEqual(['elephants-640', 'elephants-800'])
    await user.clear(box)
    await user.type(box, 'crossing')
    expect(cards()).toEqual(['elephants-640'])
  })

  it('works together with the category tabs, leaving the tab totals alone', async () => {
    const user = userEvent.setup()
    render(<TabAssets />)
    await user.click(screen.getByRole('button', { name: /^Graphics \(2\)/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), '640')
    expect(cards()).toEqual(['elephants-640'])
    expect(screen.getByRole('button', { name: /^Graphics \(2\)/ })).toBeTruthy()
  })

  it('says how many match, and offers to show everything again when none do', async () => {
    const user = userEvent.setup()
    render(<TabAssets />)
    const box = screen.getByRole('searchbox', { name: 'Search assets' })
    await user.type(box, 'elephants')
    expect(screen.getByText('2 of 3 assets')).toBeTruthy()
    await user.clear(box)
    await user.type(box, 'zzz')
    expect(screen.getByText(/No assets match/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Show all assets' }))
    expect(cards().length).toBe(3)
  })

  it('finds an asset by its web address', async () => {
    const user = userEvent.setup()
    render(<TabAssets />)
    await user.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'cdn.test/706')
    expect(within(document.body).queryAllByText('706930897').length).toBeGreaterThan(0)
    expect(cards()).toEqual(['706930897'])
  })
})
