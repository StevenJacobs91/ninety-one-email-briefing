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
import { TabGeneral } from '../../settings/TabGeneral'
import type { BriefFormData } from '../../../lib/schema'

beforeEach(() => { store.settings = createDefaultSettings() as unknown as Record<string, unknown>; vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const FRESH = {
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'newsletter', campaignName: '', theme: 'leatherback-coral', subjectLine: '', previewText: '', senderType: 'general', specificUser: '', fromName: 'Ninety One', fromAddress: '', replyToEmail: '' },
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

const sender = () => screen.getByLabelText('Sender', { selector: 'select' }) as HTMLSelectElement

describe('Sender details', () => {
  it('offers the three Pardot sender types in a dropdown, starting on General user', async () => {
    render(<Brief />)
    await act(async () => {})
    expect(Array.from(sender().options).map((o) => o.textContent)).toEqual(['General user', 'Specific user', 'Assigned user'])
    expect(sender().value).toBe('general')
  })

  it('a general user shows the from name and address', async () => {
    render(<Brief />)
    await act(async () => {})
    expect(screen.getByLabelText(/From Name/)).toBeTruthy()
    expect(screen.getByLabelText(/From Address/)).toBeTruthy()
    expect(screen.queryByLabelText(/Specific User/)).toBeNull()
  })

  it('a specific user shows a text field for the user instead', async () => {
    render(<Brief />)
    await act(async () => {})
    await act(async () => { fireEvent.change(sender(), { target: { value: 'specific' } }) })
    expect(screen.getByLabelText(/Specific User/)).toBeTruthy()
    expect(screen.queryByLabelText(/From Name/)).toBeNull()
    expect(screen.queryByLabelText(/From Address/)).toBeNull()
  })

  it('an assigned user shows no from fields, only a note', async () => {
    render(<Brief />)
    await act(async () => {})
    await act(async () => { fireEvent.change(sender(), { target: { value: 'assigned' } }) })
    expect(screen.queryByLabelText(/From Name/)).toBeNull()
    expect(screen.queryByLabelText(/Specific User/)).toBeNull()
    expect(screen.getByText(/assigned Pardot user/i)).toBeTruthy()
    // Reply-to still applies to every kind of send
    expect(screen.getByLabelText(/Reply-To Email/)).toBeTruthy()
  })
})

describe('Default sender in Settings', () => {
  it('sets who new briefs are sent as, with the fields for that type', async () => {
    render(<TabGeneral />)
    const select = screen.getByLabelText('Default Sender', { selector: 'select' }) as HTMLSelectElement
    expect(select.value).toBe('general')
    expect(screen.getByText('From Address')).toBeTruthy()
    await act(async () => { fireEvent.change(select, { target: { value: 'specific' } }) })
    expect((store.settings.senderDefaults as { senderType: string }).senderType).toBe('specific')
    expect(screen.getByText('Specific User')).toBeTruthy()
    expect(screen.queryByText('From Address')).toBeNull()
    await act(async () => { fireEvent.change(select, { target: { value: 'assigned' } }) })
    expect(screen.getByText(/assigned Pardot user/i)).toBeTruthy()
  })
})
