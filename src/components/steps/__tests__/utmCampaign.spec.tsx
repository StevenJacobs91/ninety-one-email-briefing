// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, listeners: new Set<() => void>() }))

vi.mock('../../../contexts/SettingsContext', async () => {
  const { createDefaultSettings } = await import('../../../lib/settingsDefaults')
  store.settings = createDefaultSettings() as unknown as Record<string, unknown>
  return {
    useSettings: () => {
      const settings = useSyncExternalStore(
        (cb) => { store.listeners.add(cb); return () => store.listeners.delete(cb) },
        () => store.settings,
      )
      return {
        settings,
        updateSettings: (patch: Record<string, unknown>) => { store.settings = { ...store.settings, ...patch }; store.listeners.forEach((l) => l()) },
        resetSettings: () => {}, isOpen: false, openSettings: () => {}, closeSettings: () => {}, loading: false,
      }
    },
  }
})
const auth = vi.hoisted(() => ({
  value: { user: { id: 'u1', email: 'a@x.test' }, profile: { id: 'u1', teamId: 't1', displayName: 'Admin', role: 'admin', customRoleId: null, presetClientGroups: [], presetRegions: [] }, loading: false },
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
vi.mock('../../builder2/useAvailableThemes', () => ({ useAvailableThemes: () => ({ ids: null, approximate: [] }) }))
vi.mock('../../../hooks/useAuditLog', () => ({ useAuditLog: () => ({ log: () => {} }) }))
vi.mock('../../../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }), then: (r: (v: unknown) => void) => r({ data: [], error: null }) }) }) }), auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, functions: { invoke: () => Promise.resolve({ data: null, error: null }) } } }))

import { createDefaultSettings } from '../../../lib/settingsDefaults'
import { BriefAttentionProvider } from '../../brief/BriefAttention'
import { StepCampaign } from '../StepCampaign'
import { TabCampaigns } from '../../settings/TabCampaigns'
import type { BriefFormData } from '../../../lib/schema'
import type { CampaignEntry } from '../../../types/settings.types'

const campaign = (id: string, name: string, extra: Partial<CampaignEntry> = {}): CampaignEntry => ({ id, name, regions: [], channels: [], clientGroups: [], ...extra })

beforeEach(() => {
  store.settings = { ...(createDefaultSettings() as unknown as Record<string, unknown>), campaigns: [
    campaign('1', 'Women and Investing Newsletter'),
    campaign('2', 'Taking Stock', { utmCampaign: 'taking-stock-sa' }),
  ] }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'newsletter', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', senderType: 'general', specificUser: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '', utmCampaign: '' },
  audience: { clientGroup: [], region: [], channel: [], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefFormData

function Brief() {
  const form = useForm<BriefFormData>({ defaultValues: FRESH })
  return (
    <FormProvider {...form}>
      <BriefAttentionProvider attempted={false} problems={[]}>
        <StepCampaign />
      </BriefAttentionProvider>
    </FormProvider>
  )
}

const utm = () => screen.getByLabelText(/UTM Campaign/, { selector: 'input' }) as HTMLInputElement
const pick = async (name: string) => {
  const select = document.querySelector('select#campaign-campaignName') as HTMLSelectElement
  await act(async () => { fireEvent.change(select, { target: { value: name } }) })
}

describe('UTM Campaign on the brief', () => {
  it('is in the Email Identity section, after the Brand Theme, and no longer in Sender Details', async () => {
    render(<Brief />)
    await act(async () => {})
    const identity = document.querySelector('[data-brief-section="identity"]') as HTMLElement
    const sender = document.querySelector('[data-brief-section="sender"]') as HTMLElement
    expect(identity.contains(utm())).toBe(true)
    expect(sender.contains(utm())).toBe(false)
    const theme = identity.querySelector('[name="campaign.theme"]') as HTMLElement
    expect(theme.compareDocumentPosition(utm()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('fills in from the campaign name when a campaign is chosen, joined with hyphens', async () => {
    render(<Brief />)
    await act(async () => {})
    await pick('Women and Investing Newsletter')
    expect(utm().value).toBe('women-and-investing-newsletter')
  })

  it('uses the UTM set for the campaign in Settings instead of its name', async () => {
    render(<Brief />)
    await act(async () => {})
    await pick('Taking Stock')
    expect(utm().value).toBe('taking-stock-sa')
  })

  it('can still be changed after it is filled in', async () => {
    render(<Brief />)
    await act(async () => {})
    await pick('Taking Stock')
    await act(async () => { fireEvent.change(utm(), { target: { value: 'taking-stock-special' } }) })
    expect(utm().value).toBe('taking-stock-special')
  })
})

describe('UTM Campaign in Settings → Campaigns', () => {
  it('can be set for a campaign, and is saved with it', async () => {
    render(<TabCampaigns />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '+ Add Campaign' })) })
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('e.g. SA Intermediary Taking Stock'), { target: { value: 'Advisor Impact' } }) })
    expect((screen.getByLabelText(/UTM Campaign/) as HTMLInputElement).placeholder).toBe('advisor-impact')
    await act(async () => { fireEvent.change(screen.getByLabelText(/UTM Campaign/), { target: { value: 'advisor-impact-q4' } }) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save Campaign' })) })
    const saved = (store.settings.campaigns as CampaignEntry[]).find((c) => c.name === 'Advisor Impact')
    expect(saved?.utmCampaign).toBe('advisor-impact-q4')
  })

  it('is left unset when blank, so the campaign name is used', async () => {
    render(<TabCampaigns />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '+ Add Campaign' })) })
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('e.g. SA Intermediary Taking Stock'), { target: { value: 'Advisor Impact' } }) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save Campaign' })) })
    const saved = (store.settings.campaigns as CampaignEntry[]).find((c) => c.name === 'Advisor Impact')
    expect(saved).toBeTruthy()
    expect(saved?.utmCampaign).toBeUndefined()
  })
})

describe('Campaign audiences, email type and {{month}}', () => {
  const openNew = async () => {
    render(<TabCampaigns />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '+ Add Campaign' })) })
  }

  it('offers the custom audiences and client groups made in Settings → Targeting', async () => {
    store.settings = { ...store.settings, customChannels: [{ id: 'wm', label: 'Wealth Managers' }], customClientGroups: [{ id: 'me', name: 'Middle East', regions: [] }] }
    await openNew()
    expect(screen.getByRole('button', { name: 'Wealth Managers' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Middle East' })).toBeTruthy()
  })

  it('lets the Email Type be set in the content preset, and saves it with the campaign', async () => {
    store.settings = { ...store.settings, customEmailTypes: [{ id: 'webinar', label: 'Webinar' }] }
    await openNew()
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('e.g. SA Intermediary Taking Stock'), { target: { value: 'Assistant Impact' } }) })
    const toggle = screen.getAllByRole('button').find((b) => /Add ▼/.test(b.textContent ?? '') && /Content & Design/.test(b.parentElement?.textContent ?? b.textContent ?? ''))
    await act(async () => { fireEvent.click(toggle ?? screen.getAllByText('Add ▼')[1]) })
    const select = screen.getByLabelText('Email Type') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toContain('webinar')
    await act(async () => { fireEvent.change(select, { target: { value: 'webinar' } }) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save Campaign' })) })
    const saved = (store.settings.campaigns as CampaignEntry[]).find((c) => c.name === 'Assistant Impact')
    expect(saved?.contentPreset?.emailType).toBe('webinar')
  })

  it('sets the email type and fills {{month}} from the send date when the campaign is chosen', async () => {
    store.settings = { ...store.settings, campaigns: [campaign('9', 'Assistant Impact', {
      contentPreset: { emailType: 'fund-update', theme: '', subjectLine: 'Assistant Impact – {{month}} edition | Ninety One', previewText: '', heroImageUrl: '', headline: '', subHeadline: '', signatureId: '', disclaimerId: '', distributionList: '', pardotListId: '' },
    })] }
    function Dated() {
      const form = useForm<BriefFormData>({ defaultValues: { ...FRESH, deadlines: { ...FRESH.deadlines, sendDate: '2026-12-15' } } })
      return (
        <FormProvider {...form}>
          <BriefAttentionProvider attempted={false} problems={[]}><StepCampaign /></BriefAttentionProvider>
          <output data-testid="values">{JSON.stringify([form.watch('campaign.emailType'), form.watch('campaign.subjectLine')])}</output>
        </FormProvider>
      )
    }
    render(<Dated />)
    await act(async () => {})
    await pick('Assistant Impact')
    expect(JSON.parse(screen.getByTestId('values').textContent ?? '[]')).toEqual(['fund-update', 'Assistant Impact – December edition | Ninety One'])
  })
})
