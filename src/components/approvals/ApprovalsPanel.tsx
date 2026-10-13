import { useEffect, useRef, useState } from 'react'
import type { ApprovalRecord } from '../../types/approval.types'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { ApprovalStatusBadge } from './ApprovalStatusBadge'
import { ApprovalDecisionDrawer } from './ApprovalDecisionDrawer'
import { useAuth } from '../../contexts/AuthContext'

type PanelTab = 'pending' | 'all' | 'mine'

const ROLE_LABEL: Record<string, string> = {
  brand_guardian: 'Brand Guardian',
  legal: 'Legal',
  manager: 'Manager',
  reviewer: 'Reviewer',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function dueDateLabel(iso: string | null): { label: string; className: string } | null {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: `Overdue by ${Math.abs(diff)}d`, className: 'text-red-600 dark:text-red-400' }
  if (diff === 0) return { label: 'Due today', className: 'text-amber-600 dark:text-amber-400' }
  if (diff <= 2) return { label: `Due in ${diff}d`, className: 'text-amber-500 dark:text-amber-400' }
  return { label: `Due ${formatDate(iso)}`, className: 'text-gray-400 dark:text-gray-500' }
}

interface ApprovalRowProps {
  approval: ApprovalRecord
  onReview: (approval: ApprovalRecord) => void
  showActions?: boolean
}

function ApprovalRow({ approval, onReview, showActions = true }: ApprovalRowProps) {
  const due = dueDateLabel(approval.dueDate)

  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {approval.emailName}
          </p>
          <ApprovalStatusBadge status={approval.status} size="sm" />
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400 dark:text-gray-500">
          <span>{ROLE_LABEL[approval.approverRole] ?? approval.approverRole}</span>
          <span>Stage {approval.stage}/{approval.totalStages}</span>
          {due && <span className={due.className}>{due.label}</span>}
          <span>By {approval.requestedByName}</span>
        </div>
      </div>
      {showActions && approval.status === 'pending' && (
        <button
          type="button"
          onClick={() => onReview(approval)}
          className="shrink-0 text-xs bg-brand-primary text-white px-3 py-1.5 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          Review
        </button>
      )}
      {(!showActions || approval.status !== 'pending') && (
        <button
          type="button"
          onClick={() => onReview(approval)}
          className="shrink-0 text-xs text-brand-primary dark:text-brand-accent hover:underline"
        >
          View
        </button>
      )}
    </div>
  )
}

interface ApprovalsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ApprovalsPanel({ isOpen, onClose }: ApprovalsPanelProps) {
  const { approvals, pendingCount, loading, error, refreshApprovals } = useApprovals()
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<PanelTab>('pending')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedApproval) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, selectedApproval])

  if (!isOpen) return null

  const pending = approvals.filter((a) => a.status === 'pending')
  const mine = approvals.filter(
    (a) => a.decidedBy === profile?.id || a.requestedBy === profile?.id
  )

  const tabItems: { id: PanelTab; label: string; count?: number }[] = [
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'all', label: 'All', count: approvals.length },
    { id: 'mine', label: 'My Activity', count: mine.length },
  ]

  const displayed =
    activeTab === 'pending' ? pending :
    activeTab === 'mine' ? mine :
    approvals

  async function handleRefresh() {
    setRefreshing(true)
    await refreshApprovals()
    setRefreshing(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-md z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Approvals"
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">
              Feedback & Approvals
            </p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg">
              Approvals
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none"
              aria-label="Refresh"
              title="Refresh"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-xs font-medium py-3 px-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-primary dark:border-brand-accent dark:text-brand-accent'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Loading approvals...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {activeTab === 'pending' ? 'No pending approvals' : 'No approvals found'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {activeTab === 'pending' ? 'All clear — nothing waiting for review.' : 'Approvals will appear here once briefs are submitted.'}
              </p>
            </div>
          ) : (
            <div className="px-6">
              {displayed.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  onReview={setSelectedApproval}
                  showActions={activeTab === 'pending'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nested decision drawer */}
      {selectedApproval && (
        <ApprovalDecisionDrawer
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
        />
      )}
    </>
  )
}
