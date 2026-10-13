import { useState, useEffect, useRef } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { getThemeColours } from '../../lib/themeColours'
import { ApprovalStatusBadge } from '../approvals/ApprovalStatusBadge'
import { ApprovalHistoryTimeline } from '../approvals/ApprovalHistoryTimeline'
import { SubmitForApprovalModal } from '../approvals/SubmitForApprovalModal'
import { fetchBriefById } from '../../lib/approvalsService'
import type { BriefPayload } from '../../types/brief.types'

const COLUMN_LABELS: Record<KanbanColumn, string> = {
  'briefed': 'Briefed',
  'in-progress': 'In Progress',
  'distributed': 'Distributed',
}

const COLUMN_ORDER: KanbanColumn[] = ['briefed', 'in-progress', 'distributed']

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

interface KanbanCardDetailProps {
  card: KanbanCard
  onClose: () => void
}

export function KanbanCardDetail({ card, onClose }: KanbanCardDetailProps) {
  const { moveCard, updateCardNotes, removeCard } = useKanban()
  const { settings } = useSettings()
  const { getApprovalStatusForBrief, getLatestApprovalForBrief, approvals } = useApprovals()
  const [notes, setNotes] = useState(card.notes)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSubmitApproval, setShowSubmitApproval] = useState(false)
  const [briefSnapshot, setBriefSnapshot] = useState<BriefPayload | null>(null)
  const [loadingBrief, setLoadingBrief] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const colours = getThemeColours(card.theme)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const el = drawerRef.current
    if (el) {
      const first = el.querySelector<HTMLElement>('button, textarea, [tabindex]')
      first?.focus()
    }
  }, [])

  function handleNotesBlur() {
    updateCardNotes(card.id, notes)
  }

  function handleMove(column: KanbanColumn) {
    moveCard(card.id, column)
    onClose()
  }

  function handleDelete() {
    removeCard(card.id)
    onClose()
  }

  async function handleOpenSubmitApproval() {
    setLoadingBrief(true)
    try {
      const brief = await fetchBriefById(card.briefId)
      setBriefSnapshot(brief)
    } finally {
      setLoadingBrief(false)
      setShowSubmitApproval(true)
    }
  }

  const approvalStatus = getApprovalStatusForBrief(card.briefId)
  const latestApproval = getLatestApprovalForBrief(card.briefId)
  const cardApprovals = approvals.filter((a) => a.briefId === card.briefId)
  const hasActiveApproval = approvalStatus === 'pending'

  const today = new Date()
  const sendDate = new Date(card.sendDate)
  const diffDays = Math.ceil((sendDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = diffDays < 0
  const isDueSoon = !isOverdue && diffDays <= 7

  const currentColIndex = COLUMN_ORDER.indexOf(card.column)
  const prevCol = currentColIndex > 0 ? COLUMN_ORDER[currentColIndex - 1] : null
  const nextCol = currentColIndex < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[currentColIndex + 1] : null

  // Age in current column
  const lastEntry = card.columnHistory[card.columnHistory.length - 1]
  const ageMs = Date.now() - new Date(lastEntry?.at ?? card.submittedAt).getTime()
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
  const ageLabel = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full max-w-md z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Brief detail: ${card.emailName}`}
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">Brief Detail</p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg leading-tight truncate">{card.emailName}</h2>
            <p className="text-white/50 text-xs mt-1 uppercase tracking-wider">{card.emailType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label="Close detail panel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Status row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-primary/10 text-brand-primary dark:bg-brand-accent/10 dark:text-brand-accent">
                {COLUMN_LABELS[card.column]}
              </span>
              {card.urgency === 'urgent' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Urgent
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Overdue
                </span>
              )}
              {isDueSoon && !isOverdue && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Due soon
                </span>
              )}
              {settings.approvals?.enabled && approvalStatus !== 'none' && (
                <ApprovalStatusBadge status={approvalStatus} size="sm" />
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{ageLabel} in {COLUMN_LABELS[card.column]}</span>
            </div>

            {/* Campaign info */}
            <section>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Campaign</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Subject Line</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.subjectLine || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Brand Theme</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} />
                    <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{card.theme}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Audience */}
            <section>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Audience</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Regions</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.region.join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Channels</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.channel.join(', ') || '—'}</p>
                </div>
                {card.clientGroup.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Client Groups</p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.clientGroup.join(', ')}</p>
                  </div>
                )}
              </div>
            </section>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Deadlines */}
            <section>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Deadlines</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Content Approval</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(card.contentApprovalDate)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Send Date</p>
                  <p className={`text-sm mt-0.5 font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : isDueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {formatDate(card.sendDate)}
                  </p>
                </div>
              </div>
            </section>

            {card.tags && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <section>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{card.tags}</p>
                </section>
              </>
            )}

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Notes */}
            <section>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block" htmlFor="card-notes">
                Notes
              </label>
              <textarea
                id="card-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={4}
                placeholder="Add notes about this brief..."
                className="w-full text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent focus:border-transparent placeholder-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">Auto-saved on blur</p>
            </section>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Submit for Approval */}
            {settings.approvals?.enabled && !hasActiveApproval && (
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Approval</p>
                {approvalStatus === 'approved' ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approved by {latestApproval?.decidedByName ?? 'approver'}
                  </div>
                ) : approvalStatus === 'rejected' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 dark:text-red-400">This brief was rejected. Address the feedback and resubmit.</p>
                    <button
                      type="button"
                      onClick={handleOpenSubmitApproval}
                      disabled={loadingBrief}
                      className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-brand-primary text-white py-2.5 rounded hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {loadingBrief ? 'Loading...' : 'Resubmit for Approval'}
                    </button>
                  </div>
                ) : approvalStatus === 'changes_requested' ? (
                  <div className="space-y-2">
                    <p className="text-sm text-orange-600 dark:text-orange-400">Changes were requested. Update the brief and resubmit.</p>
                    <button
                      type="button"
                      onClick={handleOpenSubmitApproval}
                      disabled={loadingBrief}
                      className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-brand-primary text-white py-2.5 rounded hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {loadingBrief ? 'Loading...' : 'Resubmit for Approval'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenSubmitApproval}
                    disabled={loadingBrief}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-brand-primary text-white py-2.5 rounded hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loadingBrief ? 'Loading brief...' : 'Submit for Approval'}
                  </button>
                )}
              </section>
            )}

            {/* Approval history */}
            {settings.approvals?.enabled && cardApprovals.length > 0 && (
              <>
                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                <section>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Approval History</p>
                  <ApprovalHistoryTimeline approvals={cardApprovals} />
                </section>
              </>
            )}

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Column history timeline */}
            <section>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">History</p>
              <ol className="space-y-3">
                {card.columnHistory.map((entry, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-primary dark:bg-brand-accent mt-0.5" />
                      {i < card.columnHistory.length - 1 && (
                        <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1 mb-0" style={{ minHeight: '16px' }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{COLUMN_LABELS[entry.column]}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="h-px bg-gray-100 dark:bg-gray-800" />

            {/* Submitted at */}
            <div className="text-[11px] text-gray-400 dark:text-gray-500">
              Brief ID: <span className="font-mono">{card.briefId}</span>
              <br />
              Added to board: {formatDateTime(card.submittedAt)}
            </div>

            {/* Danger zone */}
            {showDeleteConfirm ? (
              <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                <p className="text-sm text-red-700 dark:text-red-400 mb-3">Remove this card from the board? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 bg-red-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    Yes, remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
              >
                Remove from board
              </button>
            )}
          </div>
        </div>

        {/* Footer: move actions */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Move to column</p>
          <div className="flex gap-2">
            {prevCol && (
              <button
                type="button"
                onClick={() => handleMove(prevCol)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                {COLUMN_LABELS[prevCol]}
              </button>
            )}
            {nextCol && (
              <button
                type="button"
                onClick={() => handleMove(nextCol)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-primary text-white text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-[#0d3232] transition-colors"
              >
                {COLUMN_LABELS[nextCol]}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit for Approval modal */}
      {showSubmitApproval && briefSnapshot && (
        <SubmitForApprovalModal
          brief={briefSnapshot}
          emailName={card.emailName}
          onClose={() => setShowSubmitApproval(false)}
          onSubmitted={() => setShowSubmitApproval(false)}
        />
      )}
    </>
  )
}
