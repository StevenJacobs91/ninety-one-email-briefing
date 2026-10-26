// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalConfig, ApprovalPools } from '../../../types/approval.types'

const store = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, listeners: new Set<() => void>() }))
vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => {
    const settings = useSyncExternalStore(
      (cb) => { store.listeners.add(cb); return () => store.listeners.delete(cb) },
      () => store.settings,
    )
    return { settings, updateSettings: (patch: Record<string, unknown>) => { store.settings = { ...store.settings, ...patch }; store.listeners.forEach((l) => l()) } }
  },
}))
const auth = vi.hoisted(() => ({ value: { profile: { id: 'ada', role: 'admin', teamId: 't', displayName: 'Ada' } } as { profile: { id: string; role: string; teamId: string; displayName: string } } }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
const approvals = vi.hoisted(() => ({ value: {} as { pools: ApprovalPools; setPool: ReturnType<typeof vi.fn> } }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => approvals.value }))
const members = vi.hoisted(() => [
  { id: 'ada', displayName: 'Ada Admin', role: 'admin' },
  { id: 'lena', displayName: 'Lena Legal', role: 'producer' },
  { id: 'lou', displayName: 'Lou Lawyer', role: 'producer' },
])
vi.mock('../../../lib/supabaseQueries', () => ({ fetchTeamMembers: () => Promise.resolve(members) }))

import { TabApprovals } from '../TabApprovals'

function config(over: Partial<ApprovalConfig> = {}): ApprovalConfig {
  return {
    enabled: true,
    defaultStages: [{ stage: 1, role: 'legal', label: '', assignedUserId: null, dueDaysFromRequest: 2 }],
    emailTypeConfigs: [], blockDistributionWithoutApproval: false, ...over,
  }
}

async function open(pools: ApprovalPools = {}, cfg: ApprovalConfig = config()) {
  store.settings = { approvals: cfg, customEmailTypes: [] }
  approvals.value = { pools, setPool: vi.fn().mockResolvedValue(undefined) }
  render(<TabApprovals />)
  await act(async () => { await Promise.resolve() })
}

const fieldset = (role: string) => screen.getByRole('group', { name: role }) as HTMLFieldSetElement
const saved = () => store.settings.approvals as ApprovalConfig

beforeEach(() => { auth.value = { profile: { id: 'ada', role: 'admin', teamId: 't', displayName: 'Ada' } } })
afterEach(cleanup)

describe('Settings → Approvals: who the approvers are', () => {
  it('lists the team under each role, with the current approvers ticked', async () => {
    await open({ legal: ['lena'] })
    const legal = within(fieldset('Legal'))
    expect((legal.getByLabelText('Lena Legal') as HTMLInputElement).checked).toBe(true)
    expect((legal.getByLabelText('Lou Lawyer') as HTMLInputElement).checked).toBe(false)
    expect((within(fieldset('Manager')).getByLabelText('Lena Legal') as HTMLInputElement).checked).toBe(false)
  })

  it('lets an admin add an approver, which is saved for that role', async () => {
    await open({ legal: ['lena'] })
    await act(async () => { fireEvent.click(within(fieldset('Legal')).getByLabelText('Lou Lawyer')) })
    expect(approvals.value.setPool).toHaveBeenCalledWith('legal', ['lena', 'lou'])
  })

  it('lets an admin remove an approver', async () => {
    await open({ legal: ['lena', 'lou'] })
    await act(async () => { fireEvent.click(within(fieldset('Legal')).getByLabelText('Lena Legal')) })
    expect(approvals.value.setPool).toHaveBeenCalledWith('legal', ['lou'])
  })

  it('shows anyone but an admin the approvers without letting them change them', async () => {
    auth.value = { profile: { id: 'pam', role: 'producer', teamId: 't', displayName: 'Pam' } }
    await open({ legal: ['lena'] })
    expect(fieldset('Legal').disabled).toBe(true)
    expect(screen.getByText(/Only admins can change who the approvers are/)).toBeTruthy()
    expect((within(fieldset('Legal')).getByLabelText('Lena Legal') as HTMLInputElement).checked).toBe(true)
  })

  it('shows the reason when saving fails', async () => {
    await open({})
    approvals.value.setPool.mockRejectedValue(new Error('Only admins can change who the approvers are.'))
    await act(async () => { fireEvent.click(within(fieldset('Legal')).getByLabelText('Lou Lawyer')) })
    expect(screen.getByRole('alert').textContent).toMatch(/Only admins/)
  })

  it('warns when a role used by a stage has nobody to approve it, and stops warning once someone is added', async () => {
    await open({})
    expect(within(fieldset('Legal')).getByRole('status').textContent).toMatch(/Nobody can approve Legal stages yet/)
    // A role no stage uses is not a problem
    expect(within(fieldset('Manager')).queryByRole('status')).toBeNull()
    cleanup()
    await open({ legal: ['lena'] })
    expect(within(fieldset('Legal')).queryByRole('status')).toBeNull()
  })
})

describe('Settings → Approvals: a stage’s approver', () => {
  it('can be anyone in the role’s approvers, which is the default', async () => {
    await open({ legal: ['lena'] })
    const select = screen.getByLabelText('Approver') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(select.options[0].textContent).toMatch(/Anyone in the Legal approvers/)
  })

  it('can name one person instead, which is saved on the stage', async () => {
    await open({ legal: ['lena'] })
    await act(async () => { fireEvent.change(screen.getByLabelText('Approver'), { target: { value: 'lou' } }) })
    expect(saved().defaultStages[0].assignedUserId).toBe('lou')
  })

  it('goes back to anyone in the approvers when the named person is cleared', async () => {
    await open({}, config({ defaultStages: [{ stage: 1, role: 'legal', label: '', assignedUserId: 'lou', dueDaysFromRequest: 2 }] }))
    expect((screen.getByLabelText('Approver') as HTMLSelectElement).value).toBe('lou')
    await act(async () => { fireEvent.change(screen.getByLabelText('Approver'), { target: { value: '' } }) })
    expect(saved().defaultStages[0].assignedUserId).toBeNull()
  })
})

describe('Settings → Approvals: switches', () => {
  it('no longer offers the self-service switch, which did nothing', async () => {
    await open({})
    expect(screen.queryByText(/Allow self-service requests/)).toBeNull()
    expect(screen.getByText(/Block distribution without approval/)).toBeTruthy()
  })
})
