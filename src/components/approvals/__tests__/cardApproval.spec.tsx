// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalRecord, ApprovalStageConfig } from '../../../types/approval.types'
import type { BriefPayload } from '../../../types/brief.types'

const ctx = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('../../../contexts/ApprovalsContext', () => ({ useApprovals: () => ctx.value }))
const auth = vi.hoisted(() => ({ value: { profile: { id: 'paula', role: 'producer', teamId: 't', displayName: 'Paula' } } as { profile: { id: string; role: string; teamId: string; displayName: string } } }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => auth.value }))
const settingsMock = vi.hoisted(() => ({ value: { settings: {} as Record<string, unknown> } }))
vi.mock('../../../contexts/SettingsContext', () => ({ useSettings: () => settingsMock.value }))
const service = vi.hoisted(() => ({ fetchBriefById: vi.fn() }))
vi.mock('../../../lib/approvalsService', () => service)

import { CardApprovalSection } from '../CardApprovalSection'
import { SubmitForApprovalModal } from '../SubmitForApprovalModal'
import { ApprovalStatusBadge } from '../ApprovalStatusBadge'
import { DistributionBlockedDialog } from '../../board/DistributionBlockedDialog'

const approval = (extra: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'a1', teamId: 't', briefId: 'b1', emailName: 'Taking Stock', status: 'pending',
  requestedBy: 'paula', requestedByName: 'Paula', requestedAt: '2026-10-26T10:00:00Z',
  decidedBy: null, decidedByName: null, decidedAt: null, decisionComment: null,
  approverRole: 'legal', approverUserId: null, dueDate: null, stage: 1, totalStages: 2,
  stagesSnapshot: [], round: 1, contentHash: null, stale: false, versionSnapshot: {},
  createdAt: '2026-10-26T10:00:00Z', updatedAt: '2026-10-26T10:00:00Z', ...extra,
})

const stage = (n: number, role: ApprovalStageConfig['role']): ApprovalStageConfig =>
  ({ stage: n, role, label: '', assignedUserId: null, dueDaysFromRequest: null })

const brief = { meta: { briefId: 'b1' }, campaign: { emailType: 'newsletter' } } as unknown as BriefPayload

function provide(list: ApprovalRecord[] = [], over: Record<string, unknown> = {}) {
  ctx.value = {
    approvals: list, overrides: [], pools: { legal: ['lou'], manager: ['mo'] },
    withdraw: vi.fn().mockResolvedValue(undefined), requestApproval: vi.fn().mockResolvedValue(undefined), ...over,
  }
}

beforeEach(() => {
  auth.value = { profile: { id: 'paula', role: 'producer', teamId: 't', displayName: 'Paula' } }
  settingsMock.value = { settings: { approvals: { enabled: true, defaultStages: [stage(1, 'legal'), stage(2, 'manager')], emailTypeConfigs: [] } } }
  service.fetchBriefById.mockReset().mockResolvedValue(brief)
  provide()
})
afterEach(cleanup)

describe('the approval area of a card', () => {
  it('is not shown when approvals are switched off', () => {
    settingsMock.value = { settings: { approvals: { enabled: false } } }
    const { container } = render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(container.innerHTML).toBe('')
  })

  it('offers to submit a brief that has not been', () => {
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByRole('button', { name: 'Submit for Approval' })).toBeTruthy()
    expect(screen.queryByText('Approval History')).toBeNull()
  })

  it('says who a pending approval is waiting on', () => {
    provide([approval({ stage: 2, totalStages: 3, approverRole: 'manager' })])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/Waiting for Manager \(stage 2 of 3\)/)).toBeTruthy()
    expect(screen.getByText('Approval History')).toBeTruthy()
  })

  it('lets the person who submitted it withdraw it, with an optional reason', async () => {
    provide([approval()])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    fireEvent.change(screen.getByLabelText(/Why are you withdrawing it/), { target: { value: ' Wrong version ' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm withdraw' })) })
    expect(ctx.value.withdraw).toHaveBeenCalledWith('a1', 'Wrong version')
  })

  it('does not offer to withdraw to someone who did not submit it, unless they are an admin', () => {
    auth.value = { profile: { id: 'pam', role: 'producer', teamId: 't', displayName: 'Pam' } }
    provide([approval()])
    const { unmount } = render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.queryByRole('button', { name: 'Withdraw' })).toBeNull()
    unmount()
    auth.value = { profile: { id: 'ada', role: 'admin', teamId: 't', displayName: 'Ada' } }
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeTruthy()
  })

  it('shows the reason a withdrawal was refused', async () => {
    provide([approval()], { withdraw: vi.fn().mockRejectedValue(new Error('This approval has already been decided.')) })
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    fireEvent.click(screen.getByRole('button', { name: 'Withdraw' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm withdraw' })) })
    expect(screen.getByRole('alert').textContent).toMatch(/already been decided/)
  })

  it('sends a brief with changes requested back at the stage that asked, quoting the reason', async () => {
    provide([
      approval({ id: 's1', stage: 1, status: 'approved', decidedByName: 'Lou' }),
      approval({ id: 's2', stage: 2, status: 'changes_requested', decidedByName: 'Mo', decisionComment: 'Fix the disclaimer', createdAt: '2026-10-26T11:00:00Z' }),
    ])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/Mo asked for changes at stage 2: “Fix the disclaimer”/)).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resubmit for Approval' })) })
    expect(service.fetchBriefById).toHaveBeenCalledWith('b1')
    // The modal opens ready to resume, with the option to start again
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByLabelText(/Start again from stage 1/)).toBeTruthy()
  })

  it('says so when the brief cannot be found, rather than opening an empty dialog', async () => {
    service.fetchBriefById.mockResolvedValue(null)
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' })) })
    expect(screen.getByRole('alert').textContent).toMatch(/could not be found/)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows which version was approved', () => {
    provide([
      approval({ id: 's1', stage: 1, status: 'approved', round: 2, decidedByName: 'Lou' }),
      approval({ id: 's2', stage: 2, status: 'approved', round: 2, decidedByName: 'Mo', createdAt: '2026-10-26T11:00:00Z' }),
    ])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/Approved \(version 2\) by Mo/)).toBeTruthy()
  })

  it('says an approval no longer covers a brief that was edited, and offers to submit again', () => {
    provide([
      approval({ id: 's1', stage: 1, status: 'approved', stale: true }),
      approval({ id: 's2', stage: 2, status: 'approved', stale: true, createdAt: '2026-10-26T11:00:00Z' }),
    ])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/the brief has changed since, so the approval no longer covers it/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Submit for Approval' })).toBeTruthy()
  })

  it('explains an approval that was closed because the brief changed, and one that was withdrawn', () => {
    provide([approval({ status: 'superseded' })])
    const { unmount } = render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/brief changed after it was submitted, so the approval was closed/)).toBeTruthy()
    unmount()
    provide([approval({ status: 'withdrawn' })])
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByText(/The approval was withdrawn/)).toBeTruthy()
  })

  it('flags a brief an admin distributed without approval, with the reason', () => {
    provide([approval({ status: 'approved', totalStages: 1 })], {
      overrides: [{ id: 'o1', briefId: 'b1', actorName: 'Ada', reason: 'Client confirmed by phone', blockedFor: 'approval_pending', createdAt: '2026-10-27T10:00:00Z' }],
    })
    render(<CardApprovalSection briefId="b1" emailName="Taking Stock" />)
    expect(screen.getByRole('note').textContent).toMatch(/Distributed without approval by Ada: “Client confirmed by phone”/)
  })
})

describe('resubmitting', () => {
  function open(resumeStage: number | undefined, pools = { legal: ['lou'], manager: ['mo'] }) {
    provide([], { pools })
    const onSubmitted = vi.fn()
    render(<SubmitForApprovalModal brief={brief} emailName="Taking Stock" resumeStage={resumeStage} onClose={vi.fn()} onSubmitted={onSubmitted} />)
    return onSubmitted
  }

  it('picks up at the stage that asked for changes, keeping the earlier approvals', async () => {
    const done = open(2)
    expect(screen.getByText(/picks up at stage 2/)).toBeTruthy()
    expect(screen.getByText('Already approved')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resubmit for Approval' })) })
    expect(ctx.value.requestApproval).toHaveBeenCalledWith(brief, 'Taking Stock', [stage(1, 'legal'), stage(2, 'manager')], 2)
    expect(done).toHaveBeenCalled()
  })

  it('starts again from stage 1 when asked to', async () => {
    open(2)
    fireEvent.click(screen.getByLabelText(/Start again from stage 1/))
    expect(screen.queryByText('Already approved')).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Resubmit for Approval' })) })
    expect(ctx.value.requestApproval).toHaveBeenCalledWith(brief, 'Taking Stock', expect.anything(), 1)
  })

  it('does not hold a resubmission up for a stage that was already approved', () => {
    // Nobody is set up for Legal now, but Legal already approved; only the Manager stage still has to run.
    open(2, { legal: [], manager: ['mo'] })
    expect((screen.getByRole('button', { name: 'Resubmit for Approval' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('does hold it up when starting again and a stage has nobody to approve it', () => {
    open(2, { legal: [], manager: ['mo'] })
    fireEvent.click(screen.getByLabelText(/Start again from stage 1/))
    expect((screen.getByRole('button', { name: 'Resubmit for Approval' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toMatch(/Stage 1 \(Legal\)/)
  })

  it('is an ordinary submission, from stage 1, when there is nothing to resume', async () => {
    open(undefined)
    expect(screen.queryByLabelText(/Start again from stage 1/)).toBeNull()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Submit for Approval' })) })
    expect(ctx.value.requestApproval).toHaveBeenCalledWith(brief, 'Taking Stock', expect.anything(), 1)
  })
})

describe('the status badge', () => {
  it('marks an approval the brief has outgrown', () => {
    render(<ApprovalStatusBadge status="approved" stale />)
    expect(screen.getByText('Approved, out of date')).toBeTruthy()
  })

  it('shows the version from the second submission on', () => {
    const { unmount } = render(<ApprovalStatusBadge status="pending" round={1} />)
    expect(screen.getByText('Pending Review')).toBeTruthy()
    unmount()
    render(<ApprovalStatusBadge status="pending" round={2} />)
    expect(screen.getByText('Pending Review · v2')).toBeTruthy()
  })

  it.each([['withdrawn', 'Withdrawn'], ['superseded', 'Closed: brief changed']] as const)('has a label for %s', (status, label) => {
    render(<ApprovalStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeTruthy()
  })
})

describe('the dialog for a card that cannot be distributed', () => {
  const base = { emailName: 'Taking Stock', code: 'approval_pending' as const, onClose: vi.fn() }

  it('says why, in plain words, and that the card has not moved', () => {
    render(<DistributionBlockedDialog {...base} canOverride={false} onOverride={vi.fn()} />)
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText('This brief is still waiting for approval.')).toBeTruthy()
    expect(screen.getByText(/left where it was/)).toBeTruthy()
  })

  it('gives anyone but an admin no way round it', () => {
    render(<DistributionBlockedDialog {...base} canOverride={false} onOverride={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Distribute anyway' })).toBeNull()
    expect(screen.queryByLabelText(/Distribute anyway/)).toBeNull()
  })

  it('lets an admin distribute anyway, but only with a reason of at least 10 characters', async () => {
    const onOverride = vi.fn().mockResolvedValue(undefined)
    render(<DistributionBlockedDialog {...base} canOverride onOverride={onOverride} />)
    const button = screen.getByRole('button', { name: 'Distribute anyway' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Distribute anyway \(admins only\)/), { target: { value: 'too short' } })
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/Distribute anyway \(admins only\)/), { target: { value: '  Client confirmed by phone  ' } })
    expect(button.disabled).toBe(false)
    await act(async () => { fireEvent.click(button) })
    expect(onOverride).toHaveBeenCalledWith('Client confirmed by phone')
  })

  it('shows why an override failed', async () => {
    const onOverride = vi.fn().mockRejectedValue(new Error('Only admins can do this.'))
    render(<DistributionBlockedDialog {...base} canOverride onOverride={onOverride} />)
    fireEvent.change(screen.getByLabelText(/Distribute anyway \(admins only\)/), { target: { value: 'Client confirmed by phone' } })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Distribute anyway' })) })
    expect(screen.getByRole('alert').textContent).toMatch(/Only admins/)
  })

  it('closes without doing anything', () => {
    const onClose = vi.fn()
    render(<DistributionBlockedDialog {...base} onClose={onClose} canOverride onOverride={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
