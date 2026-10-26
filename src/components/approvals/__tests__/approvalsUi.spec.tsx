// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalPools, ApprovalRecord, ApprovalStageConfig } from '../../../types/approval.types'
import type { BriefPayload } from '../../../types/brief.types'

// The approvals context, as the screens see it.
const ctx = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ctx.value }))
const auth = vi.hoisted(() => ({ value: { profile: { id: 'lena', role: 'producer', teamId: 't', displayName: 'Lena' } } as { profile: { id: string; role: string; teamId: string; displayName: string } } }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
const settingsMock = vi.hoisted(() => ({ value: { settings: {} as Record<string, unknown> } }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => settingsMock.value }))

import { ApprovalsPanel } from '../ApprovalsPanel'
import { ApprovalDecisionDrawer } from '../ApprovalDecisionDrawer'
import { SubmitForApprovalModal } from '../SubmitForApprovalModal'
import { decisionBlock } from '../../../lib/approvalRouting'

const approval = (extra: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'a1', teamId: 't', briefId: 'b1', emailName: 'Taking Stock', status: 'pending',
  requestedBy: 'paula', requestedByName: 'Paula', requestedAt: '2026-10-26T10:00:00Z',
  decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null,
  approverRole: 'legal', approverUserId: null, dueDate: null, stage: 1, totalStages: 1,
  stagesSnapshot: [], round: 1, contentHash: null, stale: false, versionSnapshot: {}, createdAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z', ...extra,
})

const stage = (n: number, role: ApprovalStageConfig['role']): ApprovalStageConfig =>
  ({ stage: n, role, label: '', assignedUserId: null, dueDaysFromRequest: null })

function provide(over: Record<string, unknown> = {}, pools: ApprovalPools = { legal: ['lena'] }, list: ApprovalRecord[] = []) {
  const userId = auth.value.profile.id
  ctx.value = {
    approvals: list,
    pools,
    awaitingMine: list.filter((a) => decisionBlock(a, userId, pools) === null),
    mySubmissions: list.filter((a) => a.requestedBy === userId),
    decidedByMe: list.filter((a) => a.decidedBy === userId),
    pendingCount: list.filter((a) => decisionBlock(a, userId, pools) === null).length,
    loading: false, error: null,
    decisionBlockFor: (a: ApprovalRecord) => decisionBlock(a, userId, pools),
    approve: vi.fn().mockResolvedValue(undefined), reject: vi.fn().mockResolvedValue(undefined), requestChanges: vi.fn().mockResolvedValue(undefined),
    requestApproval: vi.fn().mockResolvedValue(undefined),
    refreshApprovals: vi.fn().mockResolvedValue(undefined),
    getCommentsForApproval: vi.fn().mockResolvedValue([]), addComment: vi.fn(), resolveComment: vi.fn(),
    ...over,
  }
}

beforeEach(() => {
  auth.value = { profile: { id: 'lena', role: 'producer', teamId: 't', displayName: 'Lena' } }
  settingsMock.value = { settings: { rolePermissions: undefined, approvals: { enabled: true, defaultStages: [stage(1, 'legal')], emailTypeConfigs: [], blockDistributionWithoutApproval: false } } }
})
afterEach(cleanup)

describe('the approvals panel is a personal inbox', () => {
  const list = [
    approval({ id: 'mine-to-decide', emailName: 'Waiting on Lena' }),
    approval({ id: 'someone-elses', emailName: 'For Legal, not Lena', approverRole: 'manager' }),
    approval({ id: 'submitted', emailName: 'Lena submitted this', requestedBy: 'lena' }),
    approval({ id: 'decided', emailName: 'Lena decided this', status: 'approved', decidedBy: 'lena' }),
  ]

  it('opens on what needs my decision, and shows only that', async () => {
    provide({}, { legal: ['lena'] }, list)
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.getByText('Waiting on Lena')).toBeTruthy()
    expect(screen.queryByText('For Legal, not Lena')).toBeNull()
    expect(screen.queryByText('Lena submitted this')).toBeNull()
  })

  it('counts only what is waiting on me, not the whole team', () => {
    provide({}, { legal: ['lena'] }, list)
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /Needs my decision/ }).textContent).toContain('1')
    expect(screen.getByRole('heading', { name: /Approvals/ }).textContent).toContain('1')
  })

  it('has tabs for what I submitted and what I decided', () => {
    provide({}, { legal: ['lena'] }, list)
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /My submissions/ }))
    expect(screen.getByText('Lena submitted this')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Decided by me/ }))
    expect(screen.getByText('Lena decided this')).toBeTruthy()
  })

  it('offers the All tab to admins and producers, who manage approvals, and not to requesters', () => {
    provide({}, { legal: ['lena'] }, list)
    const { unmount } = render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^All/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    expect(screen.getByText('For Legal, not Lena')).toBeTruthy()
    unmount()
    auth.value = { profile: { id: 'lena', role: 'requester', teamId: 't', displayName: 'Lena' } }
    provide({}, { legal: ['lena'] }, list)
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /^All/ })).toBeNull()
  })

  it('honours a role whose permission to manage approvals is switched off', () => {
    settingsMock.value = { settings: { rolePermissions: { producer: { canManageApprovals: false } }, approvals: { enabled: true, defaultStages: [], emailTypeConfigs: [], blockDistributionWithoutApproval: false } } }
    provide({}, { legal: ['lena'] }, list)
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /^All/ })).toBeNull()
  })

  it('says plainly when nothing is waiting', () => {
    provide({}, { legal: ['lena'] }, [])
    render(<ApprovalsPanel isOpen onClose={() => {}} />)
    expect(screen.getByText('Nothing waiting for you')).toBeTruthy()
  })
})

describe('the decision drawer', () => {
  it('lets an approver decide, and sends the decision with the comment', async () => {
    provide({}, { legal: ['lena'] })
    const approve = ctx.value.approve as ReturnType<typeof vi.fn>
    render(<ApprovalDecisionDrawer approval={approval()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit Decision' })) })
    expect(approve).toHaveBeenCalledWith('a1', '')
  })

  it('shows no decision controls to someone who submitted it, and says why', () => {
    provide({}, { legal: ['lena'] })
    render(<ApprovalDecisionDrawer approval={approval({ requestedBy: 'lena' })} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Submit Decision' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/you submitted this brief/i)
  })

  it('shows no decision controls to someone who is not an approver, and says why', () => {
    provide({}, { legal: ['someone-else'] })
    render(<ApprovalDecisionDrawer approval={approval()} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Submit Decision' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/not one of the approvers/i)
  })

  it('still lets a decided approval be read', () => {
    provide({}, { legal: ['lena'] })
    render(<ApprovalDecisionDrawer approval={approval({ status: 'approved', decidedBy: 'x' })} onClose={() => {}} />)
    expect(screen.getByText('Taking Stock')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Submit Decision' })).toBeNull()
  })

  it('keeps the drawer open and shows the reason when the database refuses the decision', async () => {
    provide({ approve: vi.fn().mockRejectedValue(new Error('This approval has already been decided.')) }, { legal: ['lena'] })
    const onClose = vi.fn()
    render(<ApprovalDecisionDrawer approval={approval()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit Decision' })) })
    expect(screen.getByRole('alert').textContent).toMatch(/already been decided/i)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the submit modal', () => {
  const brief = { meta: { briefId: 'b1' }, campaign: { emailType: 'newsletter' } } as unknown as BriefPayload

  it('lists the stages and submits when each one has someone who could decide it', async () => {
    provide({}, { legal: ['lou'] })
    const requestApproval = ctx.value.requestApproval as ReturnType<typeof vi.fn>
    const onSubmitted = vi.fn()
    render(<SubmitForApprovalModal brief={brief} emailName="Taking Stock" onClose={() => {}} onSubmitted={onSubmitted} />)
    expect(screen.queryByRole('alert')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' })) })
    expect(requestApproval).toHaveBeenCalledTimes(1)
    expect(onSubmitted).toHaveBeenCalled()
  })

  it('refuses a stage that nobody could decide, and says which', () => {
    provide({}, {})
    render(<SubmitForApprovalModal brief={brief} emailName="Taking Stock" onClose={() => {}} onSubmitted={() => {}} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Legal.*nobody/i)
    expect((screen.getByRole('button', { name: 'Submit for Approval' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('refuses a stage that only the person submitting could decide', () => {
    provide({}, { legal: ['lena'] })
    render(<SubmitForApprovalModal brief={brief} emailName="Taking Stock" onClose={() => {}} onSubmitted={() => {}} />)
    expect(screen.getByRole('alert').textContent).toMatch(/only you/i)
    expect((screen.getByRole('button', { name: 'Submit for Approval' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('uses the email type’s own stages when it has them', () => {
    settingsMock.value = { settings: { approvals: { enabled: true, defaultStages: [stage(1, 'legal')], emailTypeConfigs: [{ emailType: 'newsletter', requireAllStages: true, stages: [stage(1, 'manager')] }], blockDistributionWithoutApproval: false } } }
    provide({}, { manager: ['mo'] })
    render(<SubmitForApprovalModal brief={brief} emailName="Taking Stock" onClose={() => {}} onSubmitted={() => {}} />)
    expect(screen.getAllByText(/Manager/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Legal/)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
