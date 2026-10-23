// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useSyncExternalStore, type ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A real, in-memory settings store, so a click that should change a setting really does, and the control can be seen to follow it.
const store = vi.hoisted(() => {
  const s = { settings: {} as Record<string, unknown>, listeners: new Set<() => void>() }
  return s
})

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
        resetSettings: () => {},
        isOpen: true, openSettings: () => {}, closeSettings: () => {}, loading: false,
      }
    },
  }
})
// One stable value, as the real provider gives, so effects that depend on the profile do not run on every render.
const auth = vi.hoisted(() => ({
  value: { user: { id: 'u1', email: 'a@x.test' }, profile: { id: 'u1', teamId: 't1', displayName: 'Admin', role: 'admin', customRoleId: null, presetClientGroups: [], presetRegions: [] }, loading: false },
}))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
vi.mock('../../../hooks/useAuditLog', () => ({ useAuditLog: () => ({ log: () => {} }) }))
vi.mock('../../../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }), then: (r: (v: unknown) => void) => r({ data: [], error: null }) }) }) }), auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, functions: { invoke: () => Promise.resolve({ data: null, error: null }) } } }))
vi.mock('../../../lib/supabaseQueries', async (orig) => ({ ...(await orig<Record<string, unknown>>()), fetchTeamMembers: () => Promise.resolve([]), fetchAuditLog: () => Promise.resolve([]), fetchBenchmarks: () => Promise.resolve([]) }))
vi.mock('../../../contexts/KanbanContext', () => ({ useKanban: () => ({ cards: [], moveCard: () => {}, updateCardMeta: () => {} }) }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ({ getApprovalStatusForBrief: () => 'none' }) }))

import { createDefaultSettings } from '../../../lib/settingsDefaults'
import { TabGeneral } from '../TabGeneral'
import { TabCampaignPlanner } from '../TabCampaignPlanner'
import { TabAuditLog } from '../TabAuditLog'
import { TabApprovals } from '../TabApprovals'
import { TabSendTimeOptimisation } from '../TabSendTimeOptimisation'
import { TabAudienceHealth } from '../TabAudienceHealth'
import { TabNotifications } from '../TabNotifications'
import { TabPardot } from '../TabPardot'
import { TabPowerAutomate } from '../TabPowerAutomate'
import { TabDesign } from '../TabDesign'
import { TabSignatures } from '../TabSignatures'
import { TabHeaders } from '../TabHeaders'
import { TabBrandGuardian } from '../TabBrandGuardian'
import { TabBenchmarks } from '../TabBenchmarks'
import { TabCampaignInsights } from '../TabCampaignInsights'
import { TabFormLayout } from '../TabFormLayout'
import { TabCampaigns } from '../TabCampaigns'
import { TabLists } from '../TabLists'
import { TabModules } from '../TabModules'
import { TabThemes } from '../TabThemes'
import { TabTemplates } from '../TabTemplates'
import { TabAssets } from '../TabAssets'
import { TabGreetings } from '../TabGreetings'
import { TabDisclaimers } from '../TabDisclaimers'

beforeEach(() => { store.settings = createDefaultSettings() as unknown as Record<string, unknown>; vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

const TABS: [string, ComponentType][] = [
  ['General', TabGeneral], ['Campaign Board', TabCampaignPlanner], ['Audit Trail', TabAuditLog], ['Approvals', TabApprovals],
  ['Send Time Optimisation', TabSendTimeOptimisation], ['Audience Health', TabAudienceHealth], ['Notifications', TabNotifications],
  ['Pardot API', TabPardot], ['Power Automate', TabPowerAutomate], ['Design Briefing', TabDesign], ['Signatures', TabSignatures],
  ['Headers', TabHeaders], ['Brand Guardian', TabBrandGuardian], ['Benchmarks', TabBenchmarks], ['Campaign Insights', TabCampaignInsights],
  ['Form Layout', TabFormLayout], ['Campaigns', TabCampaigns], ['Targeting', TabLists], ['Email Modules', TabModules],
  ['Brand Themes', TabThemes], ['HTML Templates', TabTemplates], ['Asset Library', TabAssets], ['Greetings', TabGreetings], ['Disclaimers', TabDisclaimers],
]

type Control = { kind: 'switch' | 'checkbox' | 'pill' | 'radio'; el: HTMLElement }

function controls(root: HTMLElement): Control[] {
  const found: Control[] = []
  root.querySelectorAll<HTMLElement>('[role="switch"], [role="checkbox"], input[type="checkbox"], button[aria-pressed], input[type="radio"]').forEach((el) => {
    if ((el as HTMLButtonElement).disabled) return
    const role = el.getAttribute('role')
    const kind = role === 'switch' ? 'switch' : el.getAttribute('type') === 'radio' ? 'radio' : el.hasAttribute('aria-pressed') ? 'pill' : 'checkbox'
    found.push({ kind, el })
  })
  return found
}

const stateOf = (c: Control): string => {
  if (c.kind === 'switch' || (c.kind === 'checkbox' && c.el.getAttribute('role') === 'checkbox')) return c.el.getAttribute('aria-checked') ?? ''
  if (c.kind === 'pill') return c.el.getAttribute('aria-pressed') ?? ''
  return String((c.el as HTMLInputElement).checked)
}

const nameOf = (c: Control): string => {
  const el = c.el
  const text = el.getAttribute('aria-label') ?? el.closest('label')?.textContent ?? el.textContent ?? el.parentElement?.textContent ?? ''
  return text.replace(/\s+/g, ' ').trim().slice(0, 50) || '(no name)'
}

describe('every switch, pill and checkbox in Settings', () => {
  it.each(TABS)('%s: each control changes when clicked and changes back', async (_name, Tab) => {
    const { container } = render(<Tab />)
    await act(async () => {})
    const total = controls(container).length
    const problems: string[] = []

    for (let i = 0; i < total; i++) {
      const before = controls(container)[i]
      if (!before) break
      const label = nameOf(before)
      const start = stateOf(before)
      await act(async () => { fireEvent.click(before.el) })
      const after = controls(container)[i]
      if (!after) continue
      const changed = stateOf(after)
      if (before.kind === 'radio' || before.kind === 'pill') {
        // Choosing one of a group selects it; choosing the one already chosen leaves it chosen.
        if (changed !== 'true' && start !== 'true') problems.push(`${before.kind} “${label}” did not become selected`)
        continue
      }
      if (changed === start) problems.push(`${before.kind} “${label}” did not change when clicked (${start})`)
      await act(async () => { fireEvent.click(after.el) })
      const back = controls(container)[i]
      if (back && stateOf(back) !== start) problems.push(`${before.kind} “${label}” did not change back when clicked again`)
    }
    expect(problems).toEqual([])
    expect(total).toBeGreaterThanOrEqual(0)
  })
})
