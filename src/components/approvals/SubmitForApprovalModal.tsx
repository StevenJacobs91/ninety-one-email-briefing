import { useState } from 'react'
import type { BriefPayload } from '../../types/brief.types'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { APPROVAL_ROLE_LABELS, describeStageIssue, resolveStages, stageIssues } from '../../lib/approvalRouting'

const ROLE_LABEL: Record<string, string> = {
  brand_guardian: 'Brand Guardian',
  legal: 'Legal',
  manager: 'Manager',
  reviewer: 'Reviewer',
}

interface SubmitForApprovalModalProps {
  brief: BriefPayload
  emailName: string
  /** Set when the brief came back with changes requested: the stage that asked for them, which is where it resumes */
  resumeStage?: number
  onClose: () => void
  onSubmitted: () => void
}

export function SubmitForApprovalModal({
  brief,
  emailName,
  resumeStage,
  onClose,
  onSubmitted,
}: SubmitForApprovalModalProps) {
  const { requestApproval, pools } = useApprovals()
  const { settings } = useSettings()
  const { profile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // A resubmission picks up at the stage that asked for changes, keeping the approvals already given, unless they ask to start again.
  const [startAgain, setStartAgain] = useState(false)
  const resuming = !!resumeStage && resumeStage > 1 && !startAgain
  const startStage = resuming ? resumeStage : 1

  // The email type's own stages if it has them, else the defaults
  const stages = resolveStages(settings.approvals, brief.campaign.emailType)
  // A stage nobody could decide, or that only the person submitting could, would leave the brief stuck: say so before it is sent.
  // Stages already approved and carried forward do not need anyone new.
  const issues = stageIssues(stages.filter((st) => st.stage >= startStage), pools, profile?.id)

  async function handleSubmit() {
    if (stages.length === 0) {
      setError('No approval stages configured. Please set up approval stages in Settings → Approvals.')
      return
    }
    if (issues.length > 0) return
    setSubmitting(true)
    setError('')
    try {
      await requestApproval(brief, emailName, stages, startStage)
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit for approval')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-approval-title"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <h2
              id="submit-approval-title"
              className="font-ni-display text-brand-primary dark:text-brand-accent text-lg"
            >
              {resumeStage ? 'Resubmit for Approval' : 'Submit for Approval'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{emailName}</p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {stages.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No approval stages are configured. Go to{' '}
                  <strong>Settings → Approvals</strong> to set up your approval workflow.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {resuming
                    ? `This picks up at stage ${startStage}, where changes were asked for. The stages before it keep their approval.`
                    : 'This brief will go through the following approval stages:'}
                </p>
                <ol className="space-y-2">
                  {stages.map((stage, i) => (
                    <li key={i} className={`flex items-center gap-3 ${resuming && stage.stage < startStage ? 'opacity-60' : ''}`}>
                      <span className="w-6 h-6 rounded-full bg-brand-primary/10 dark:bg-brand-accent/10 text-brand-primary dark:text-brand-accent text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {stage.label || ROLE_LABEL[stage.role] || stage.role}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          {resuming && stage.stage < startStage
                            ? 'Already approved'
                            : stage.assignedUserId ? 'Assigned approver' : `Any ${ROLE_LABEL[stage.role] ?? stage.role}`}
                          {stage.dueDaysFromRequest
                            ? ` · ${stage.dueDaysFromRequest} day${stage.dueDaysFromRequest !== 1 ? 's' : ''} to review`
                            : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                {!!resumeStage && resumeStage > 1 && (
                  <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={startAgain}
                      onChange={(e) => setStartAgain(e.target.checked)}
                      className="mt-0.5 accent-brand-primary"
                    />
                    <span>Start again from stage 1, so every approver looks at it again</span>
                  </label>
                )}
              </>
            )}

            {issues.length > 0 && (
              <div role="alert" className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">This cannot be submitted yet:</p>
                {issues.map((issue) => (
                  <p key={issue.stage} className="text-xs text-amber-700 dark:text-amber-400">
                    {describeStageIssue(issue, APPROVAL_ROLE_LABELS[issue.role])}
                  </p>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || stages.length === 0 || issues.length > 0}
              className="flex-1 bg-brand-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-primary/90 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting...' : resumeStage ? 'Resubmit for Approval' : 'Submit for Approval'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
