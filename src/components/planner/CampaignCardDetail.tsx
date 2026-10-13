import { useState, useEffect, useRef } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { useAuth } from '../../contexts/AuthContext'
import { getThemeColours } from '../../lib/themeColours'

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
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface CampaignCardDetailProps {
  card: KanbanCard
  onClose: () => void
}

export function CampaignCardDetail({ card, onClose }: CampaignCardDetailProps) {
  const { moveCard, updateCardNotes, updateCardMeta, addComment, removeCard } = useKanban()
  const { profile, user } = useAuth()
  const drawerRef = useRef<HTMLDivElement>(null)
  const colours = getThemeColours(card.theme)

  const [notes, setNotes] = useState(card.notes)
  const [assignee, setAssignee] = useState(card.assignee ?? '')
  const [startDate, setStartDate] = useState(card.startDate ?? '')
  const [progress, setProgress] = useState(card.progress ?? 0)
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details')

  // Sync card updates
  useEffect(() => {
    setNotes(card.notes)
    setAssignee(card.assignee ?? '')
    setStartDate(card.startDate ?? '')
    setProgress(card.progress ?? 0)
  }, [card])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus trap
  useEffect(() => {
    const el = drawerRef.current?.querySelector<HTMLElement>('button, input, textarea, [tabindex]')
    el?.focus()
  }, [])

  const today = new Date()
  const sendDate = new Date(card.sendDate)
  const diffDays = Math.ceil((sendDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = card.sendDate && diffDays < 0
  const isDueSoon = card.sendDate && !isOverdue && diffDays <= 7

  const currentColIndex = COLUMN_ORDER.indexOf(card.column)
  const prevCol = currentColIndex > 0 ? COLUMN_ORDER[currentColIndex - 1] : null
  const nextCol = currentColIndex < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[currentColIndex + 1] : null

  function handleNotesBlur() {
    updateCardNotes(card.id, notes)
  }

  function handleMetaBlur() {
    updateCardMeta(card.id, {
      assignee: assignee || undefined,
      startDate: startDate || undefined,
      progress,
    })
  }

  function handleMove(column: KanbanColumn) {
    moveCard(card.id, column)
    onClose()
  }

  function handleDelete() {
    removeCard(card.id)
    onClose()
  }

  function handleAddComment() {
    const text = commentText.trim()
    if (!text) return
    addComment(card.id, {
      authorId: user?.id ?? 'anon',
      authorName: profile?.displayName ?? user?.email ?? 'Anonymous',
      text,
      createdAt: new Date().toISOString(),
    })
    setCommentText('')
  }

  const comments = card.comments ?? []

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full max-w-md z-50 bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Campaign detail: ${card.emailName}`}
      >
        {/* Header */}
        <div className="bg-brand-primary px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">Campaign Detail</p>
            <h2 className="font-ni-display text-[#e8e5ce] text-lg leading-tight truncate">{card.emailName}</h2>
            <p className="text-white/50 text-xs mt-1 uppercase tracking-wider">{card.emailType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Status row */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 flex-wrap bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-primary/10 text-brand-primary dark:bg-brand-accent/10 dark:text-brand-accent">
            {COLUMN_LABELS[card.column]}
          </span>
          {card.urgency === 'urgent' && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
          )}
          {isDueSoon && !isOverdue && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Due soon</span>
          )}
          {/* Comments badge */}
          {comments.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {comments.length}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          {(['details', 'comments', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-ni-heading tracking-[0.1em] uppercase transition-colors focus-visible:outline-none ${
                activeTab === tab
                  ? 'text-brand-primary dark:text-brand-accent border-b-2 border-brand-primary dark:border-brand-accent -mb-px'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'comments' ? `Comments${comments.length > 0 ? ` (${comments.length})` : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div className="p-6 space-y-5">
              {/* Campaign info */}
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Campaign</p>
                <div className="space-y-2.5">
                  {card.subjectLine && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Subject Line</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.subjectLine}</p>
                    </div>
                  )}
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

              {/* Dates */}
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Dates</p>
                <div className="grid grid-cols-3 gap-3">
                  {card.startDate && (
                    <div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Start</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(card.startDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Approval</p>
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

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* Meta editable fields */}
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Planning</p>
                <div className="space-y-3">
                  {/* Assignee */}
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Assignee</label>
                    <input
                      type="text"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      onBlur={handleMetaBlur}
                      placeholder="Person responsible"
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                    />
                  </div>
                  {/* Start date */}
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Production Start</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onBlur={handleMetaBlur}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                    />
                  </div>
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Progress</label>
                      <span className="text-xs font-medium text-brand-primary dark:text-brand-accent">{progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      onMouseUp={handleMetaBlur}
                      onTouchEnd={handleMetaBlur}
                      className="w-full accent-brand-primary"
                    />
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div
                        className="h-1.5 rounded-full bg-brand-primary dark:bg-brand-accent transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* Notes */}
              <section>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={4}
                  placeholder="Add notes about this campaign..."
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent placeholder-gray-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">Auto-saved on blur</p>
              </section>

              {/* Audience */}
              {(card.region.length > 0 || card.channel.length > 0) && (
                <>
                  <div className="h-px bg-gray-100 dark:bg-gray-800" />
                  <section>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Audience</p>
                    <div className="grid grid-cols-2 gap-3">
                      {card.region.length > 0 && (
                        <div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Regions</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.region.join(', ')}</p>
                        </div>
                      )}
                      {card.channel.length > 0 && (
                        <div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Channels</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{card.channel.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {card.tags && (
                <>
                  <div className="h-px bg-gray-100 dark:bg-gray-800" />
                  <section>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{tag}</span>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* Danger zone */}
              {showDeleteConfirm ? (
                <div className="border border-red-200 dark:border-red-900 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">Remove this campaign? This cannot be undone.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={handleDelete} className="flex-1 bg-red-600 text-white text-xs font-medium px-4 py-2 rounded hover:bg-red-700 transition-colors">
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors">
                  Remove campaign
                </button>
              )}
            </div>
          )}

          {/* ── COMMENTS TAB ── */}
          {activeTab === 'comments' && (
            <div className="p-6 space-y-4">
              {/* Add comment */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Add Comment</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
                  }}
                  rows={3}
                  placeholder="Write a comment... (⌘↵ to post)"
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="mt-2 text-xs font-medium bg-brand-primary text-white px-4 py-2 rounded hover:bg-[#0d3232] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Post Comment
                </button>
              </div>

              {/* Comment list */}
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Be the first to add a comment</p>
                </div>
              ) : (
                <ol className="space-y-4">
                  {comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3">
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-brand-primary/15 dark:bg-brand-accent/15 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-brand-primary dark:text-brand-accent">
                          {comment.authorName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{comment.authorName}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="p-6 space-y-5">
              <section>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Column History</p>
                <ol className="space-y-3">
                  {card.columnHistory.map((entry, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary dark:bg-brand-accent mt-0.5" />
                        {i < card.columnHistory.length - 1 && (
                          <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" style={{ minHeight: '16px' }} />
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

              <div className="text-[11px] text-gray-400 dark:text-gray-500 space-y-1">
                <p>Brief ID: <span className="font-mono">{card.briefId}</span></p>
                <p>Added to board: {formatDateTime(card.submittedAt)}</p>
              </div>
            </div>
          )}
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
