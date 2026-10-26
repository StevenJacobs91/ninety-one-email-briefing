// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
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
import { fieldPositions, resolveHidden } from '../../../lib/briefLayout'
import type { BriefFormData } from '../../../lib/schema'

beforeEach(() => {
  store.settings = createDefaultSettings() as unknown as Record<string, unknown>
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

function Brief({ saved, hidden }: { saved?: Record<string, string[]>; hidden?: string[] }) {
  const form = useForm<BriefFormData>({ defaultValues: FRESH })
  return (
    <FormProvider {...form}>
      <BriefAttentionProvider attempted={false} problems={[]} fieldOrder={fieldPositions(saved)} hidden={resolveHidden(hidden)}>
        <StepCampaign />
      </BriefAttentionProvider>
    </FormProvider>
  )
}

const slot = (path: string) => document.querySelector(`[data-brief-field="${path}"]`) as HTMLElement | null
const position = (path: string) => slot(path)?.style.order

describe('fields on the brief follow Settings → Form Layout', () => {
  it('sit in their built-in order when nothing is set', async () => {
    render(<Brief />)
    await act(async () => {})
    expect(position('campaign.subjectLine')).toBe('1')
    expect(position('campaign.previewText')).toBe('2')
    expect(position('campaign.emailType')).toBe('1')
    expect(position('campaign.utmCampaign')).toBe('5')
  })

  it('sit in the saved order within their section', async () => {
    render(<Brief saved={{ envelope: ['campaign.previewText', 'campaign.subjectLine'], identity: ['campaign.utmCampaign', 'campaign.emailType', 'campaign.theme', 'campaign.campaignName', 'campaign.emailDescription'] }} />)
    await act(async () => {})
    expect(position('campaign.previewText')).toBe('1')
    expect(position('campaign.subjectLine')).toBe('2')
    expect(position('campaign.utmCampaign')).toBe('1')
    expect(position('campaign.emailDescription')).toBe('5')
  })

  it('leave out a field that is switched off, with its label and its input', async () => {
    render(<Brief hidden={['campaign.utmCampaign', 'campaign.replyToEmail']} />)
    await act(async () => {})
    expect(slot('campaign.utmCampaign')).toBeNull()
    expect(screen.queryByLabelText(/UTM Campaign/)).toBeNull()
    expect(screen.queryByLabelText(/Reply-To Email/)).toBeNull()
    expect(screen.getByLabelText(/From Name/)).toBeTruthy()
  })

  it('keep the subject line checker under every field of the section, wherever the fields are put', async () => {
    const orders = (saved?: Record<string, string[]>) => {
      cleanup()
      render(<Brief saved={saved} />)
      const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-brief-section="envelope"] [data-brief-field]'))
      const checker = slots.find((el) => el.querySelector('[aria-label="Subject line score"]'))
      const fields = slots.filter((el) => el !== checker)
      return { checker: Number(checker?.style.order), fields: fields.map((el) => Number(el.style.order)) }
    }
    for (const saved of [undefined, { envelope: ['campaign.previewText', 'campaign.subjectLine'] }]) {
      const { checker, fields } = orders(saved)
      expect(fields.length).toBe(2)
      expect(Math.max(...fields)).toBeLessThan(checker)
    }
  })

  it('take the subject line checker away with the subject line', async () => {
    render(<Brief />)
    await act(async () => {})
    expect(document.querySelectorAll('[data-brief-field="campaign.subjectLine"]').length).toBe(2)
    cleanup()
    render(<Brief hidden={['campaign.subjectLine']} />)
    await act(async () => {})
    expect(document.querySelectorAll('[data-brief-field="campaign.subjectLine"]').length).toBe(0)
    expect(screen.getByLabelText(/Preview Text/)).toBeTruthy()
  })

  it('keep the 1-1 control when the send date is switched off', async () => {
    render(<Brief hidden={['deadlines.sendDate']} />)
    await act(async () => {})
    expect(screen.queryByLabelText(/Send Date/)).toBeNull()
    expect(screen.getByRole('group', { name: '1-1 required' })).toBeTruthy()
  })

  it('show the 1-1 control beside the send date when it is on', async () => {
    render(<Brief />)
    await act(async () => {})
    expect(screen.getByLabelText(/Send Date/)).toBeTruthy()
    expect(screen.getByRole('group', { name: '1-1 required' })).toBeTruthy()
  })

  it('count a switched-off field out of its section’s badge and never mark it as a problem', async () => {
    render(<Brief hidden={['campaign.subjectLine', 'campaign.previewText']} />)
    await act(async () => {})
    const envelope = document.querySelector('[data-brief-section="envelope"]') as HTMLElement
    expect(envelope.querySelector('h3')?.textContent).toContain('Optional')
  })
})
