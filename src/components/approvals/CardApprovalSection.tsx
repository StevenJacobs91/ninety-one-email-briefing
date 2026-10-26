import { useState } from 'react'
import type { BriefPayload } from '../../types/brief.types'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import { fetchBriefById } from '../../lib/approvalsService'
import { APPROVAL_ROLE_LABELS, briefApprovalState } from '../../lib/approvalRouting'
import { ApprovalHistoryTimeline } from './ApprovalHistoryTimeline'
import { SubmitForApprovalModal } from './SubmitForApprovalModal'

interface CardApprovalSectionProps {
  briefId: string
  emailName: string
}

const PRIMARY_BUTTON =
  'w-full flex items-center justify-center gap-2 text-xs font-medium bg-brand-primary text-white py-2.5 rounded hover:bg-brand-primary/90 disabled:opacity-50 transition-colors'

/**
 * Where a brief stands in approval, what the person looking at it can do next, and what has happened so far.
 * Renders nothing when Approvals is switched off.
 */
export function CardApprovalSection({ briefId, emailName }: CardApprovalSectionProps) {
  const { approvals, overrides, withdraw } = useApprovals()
  const { settings } = useSettings()
  const { profile } = useAuth()
  const [modal, setModal] = useState<{ brief: BriefPayload; resumeStage?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  if (!settings.approvals?.enabled) return null

  const history = approvals.filter((a) => a.briefId === briefId)
  const { state, latest, round, resumeStage } = briefApprovalState(approvals, briefId)
  const canWithdraw = state === 'pending' && !!latest && (latest.requestedBy === profile?.id || profile?.role === 'admin')
  const override = overrides.find((o) => o.briefId === briefId)
  const roleLabel = latest ? (APPROVAL_ROLE_LABELS[latest.approverRole] ?? latest.approverRole) : ''

  async function openSubmit(resume?: number) {
    setLoading(true)
    setError('')
    try {
      const brief = await fetchBriefById(briefId)
      if (!brief) {
        setError('The brief could not be found. Save it from the Brief tab first.')
        return
      }
      setModal({ brief, resumeStage: resume })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The brief could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmWithdraw() {
    if (!latest) return
    setWorking(true)
    setError('')
    try {
      await withdraw(latest.id, reason.trim())
      setConfirmingWithdraw(false)
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw the approval.')
    } finally {
      setWorking(false)
    }
  }

  const submitButton = (label: string, resume?: number) => (
    <button type="button" onClick={() => openSubmit(resume)} disabled={loading} className={PRIMARY_BUTTON}>
      {loading ? 'Loading…' : label}
    </button>
  )

  return (
    <>
      <section aria-label="Approval">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Approval</p>

        {state === 'none' && submitButton('Submit for Approval')}

        {state === 'pending' && latest && (
          <div className="space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Waiting for {roleLabel} (stage {latest.stage} of {latest.totalStages}).
            </p>
            {canWithdraw && !confirmingWithdraw && (
              <button
                type="button"
                onClick={() => setConfirmingWithdraw(true)}
                className="w-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Withdraw
              </button>
            )}
            {canWithdraw && confirmingWithdraw && (
              <div className="space-y-2">
                <label htmlFor="withdraw-reason" className="text-[11px] text-gray-500 dark:text-gray-400 block">
                  Why are you withdrawing it? (optional)
                </label>
                <input
                  id="withdraw-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={confirmWithdraw} disabled={working} className={PRIMARY_BUTTON}>
                    {working ? 'Withdrawing…' : 'Confirm withdraw'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmingWithdraw(false); setReason('') }}
                    className="shrink-0 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'changes_requested' && (
          <div className="space-y-2">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {latest?.decidedByName ?? 'An approver'} asked for changes at stage {resumeStage}
              {latest?.decisionComment ? `: “${latest.decisionComment}”` : '.'} Update the brief and resubmit.
            </p>
            {submitButton('Resubmit for Approval', resumeStage)}
          </div>
        )}

        {state === 'rejected' && (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400">This brief was rejected. Address the feedback and resubmit.</p>
            {submitButton('Resubmit for Approval')}
          </div>
        )}

        {state === 'withdrawn' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">The approval was withdrawn. Submit it again when it is ready.</p>
            {submitButton('Submit for Approval')}
          </div>
        )}

        {state === 'superseded' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The brief changed after it was submitted, so the approval was closed. Submit it again.
            </p>
            {submitButton('Submit for Approval')}
          </div>
        )}

        {state === 'approved' && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Approved{round && round > 1 ? ` (version ${round})` : ''} by {latest?.decidedByName ?? 'approver'}
          </div>
        )}

        {state === 'out_of_date' && (
          <div className="space-y-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              This was approved{round && round > 1 ? ` (version ${round})` : ''}, but the brief has changed since, so the approval no longer covers it.
            </p>
            {submitButton('Submit for Approval')}
          </div>
        )}

        {override && (
          <p className="mt-3 text-xs text-red-700 dark:text-red-400" role="note">
            Distributed without approval by {override.actorName}: “{override.reason}”
          </p>
        )}

        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {history.length > 0 && (
        <>
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          <section aria-label="Approval history">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Approval History</p>
            <ApprovalHistoryTimeline approvals={history} />
          </section>
        </>
      )}

      {modal && (
        <SubmitForApprovalModal
          brief={modal.brief}
          emailName={emailName}
          resumeStage={modal.resumeStage}
          onClose={() => setModal(null)}
          onSubmitted={() => setModal(null)}
        />
      )}
    </>
  )
}
