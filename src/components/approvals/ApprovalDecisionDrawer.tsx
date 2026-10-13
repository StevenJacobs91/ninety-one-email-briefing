import { useEffect, useRef, useState } from 'react'
import type { ApprovalRecord } from '../../types/approval.types'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { ApprovalCommentThread } from './ApprovalCommentThread'
import { ApprovalStatusBadge } from './ApprovalStatusBadge'

const ROLE_LABEL: Record<string, string> = {
  brand_guardian: 'Brand Guardian',
  legal: 'Legal',
  manager: 'Manager',
  reviewer: 'Reviewer',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

interface ApprovalDecisionDrawerProps {
  approval: ApprovalRecord
  onClose: () => void
}

type Decision = 'approved' | 'rejected' | 'changes_requested'

const DECISION_LABELS: Record<Decision, string> = {
  approved: 'Approve',
  rejected: 'Reject',
  changes_requested: 'Request Changes',
}

export function ApprovalDecisionDrawer({ approval, onClose }: ApprovalDecisionDrawerProps) {
  const { approve, reject, requestChanges } = useApprovals()
  const [decision, setDecision] = useState<Decision | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const drawerRef = useRef<HTMLDivElement>(null)

  // Extract brief snapshot fields for preview
  const snapshot = approval.versionSnapshot as Record<string, unknown>
  const campaign = snapshot?.campaign as Record<string, string> | undefined
  const deadlines = snapshot?.deadlines as Record<string, string> | undefined

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    drawerRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
  }, [])

  async function handleSubmit() {
    if (!decision) {
      setError('Please select a decision.')
      return
    }
    if ((decision === 'rejected' || decision === 'changes_requested') && comment.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters).')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      if (decision === 'approved') await approve(approval.id, comment)
      else if (decision === 'rejected') await reject(approval.id, comment)
      else await requestChanges(approval.id, comment)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit decision')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full max-w-lg z-70 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Approval decision"
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">
              Stage {approval.stage}/{approval.totalStages} — {ROLE_LABEL[approval.approverRole] ?? approval.approverRole}
            </p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg leading-tight">
              {approval.emailName}
            </h2>
            <div className="mt-2">
              <ApprovalStatusBadge status={approval.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            tabIndex={0}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Brief snapshot summary */}
            {campaign && (
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Brief Summary</p>
                <div className="space-y-2.5">
                  {campaign.subjectLine && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Subject Line</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{campaign.subjectLine}</p>
                    </div>
                  )}
                  {campaign.emailType && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email Type</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 capitalize">{campaign.emailType}</p>
                    </div>
                  )}
                  {deadlines?.sendDate && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Send Date</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(deadlines.sendDate)}</p>
                    </div>
                  )}
                  {approval.dueDate && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Approval Due</p>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-0.5">{formatDate(approval.dueDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Requested By</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{approval.requestedByName}</p>
                  </div>
                </div>
              </section>
            )}

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Comments */}
            {approval.status !== 'pending' ? (
              <section>
                <ApprovalCommentThread approvalId={approval.id} briefId={approval.briefId} />
              </section>
            ) : (
              <section>
                <ApprovalCommentThread approvalId={approval.id} briefId={approval.briefId} />
              </section>
            )}

            {/* Decision form — only when pending */}
            {approval.status === 'pending' && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <section>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Your Decision
                  </p>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['approved', 'changes_requested', 'rejected'] as Decision[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDecision(d)}
                        className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors ${
                          decision === d
                            ? d === 'approved'
                              ? 'bg-green-600 border-green-600 text-white'
                              : d === 'rejected'
                                ? 'bg-red-600 border-red-600 text-white'
                                : 'bg-orange-500 border-orange-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {DECISION_LABELS[d]}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                      Comment {(decision === 'rejected' || decision === 'changes_requested') ? '(required)' : '(optional)'}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder={
                        decision === 'approved'
                          ? 'Optional approval note...'
                          : 'Describe what needs to change...'
                      }
                      className="w-full text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {approval.status === 'pending' && (
          <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !decision}
              className="flex-1 bg-brand-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-primary/90 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Decision'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  )
}
