import { useState, useEffect, useCallback } from 'react'
import type { ApprovalComment, CommentType, CommentCategory } from '../../types/approval.types'
import { useApprovals } from '../../contexts/ApprovalsContext'

const COMMENT_TYPE_OPTIONS: { value: CommentType; label: string }[] = [
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'question', label: 'Question' },
  { value: 'private_note', label: 'Private Note' },
]

const CATEGORY_OPTIONS: { value: CommentCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'brand', label: 'Brand' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'compliance', label: 'Compliance' },
]

const TYPE_DOT: Record<CommentType, string> = {
  change_request: 'bg-orange-400',
  suggestion: 'bg-blue-400',
  question: 'bg-purple-400',
  private_note: 'bg-gray-400',
  approval: 'bg-green-400',
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

interface CommentItemProps {
  comment: ApprovalComment
  approvalId: string
  briefId: string
  depth?: number
}

function CommentItem({ comment, approvalId, briefId, depth = 0 }: CommentItemProps) {
  const { addComment, resolveComment } = useApprovals()
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replyType, setReplyType] = useState<CommentType>('suggestion')
  const [submitting, setSubmitting] = useState(false)

  async function handleReply() {
    if (!replyBody.trim()) return
    setSubmitting(true)
    try {
      await addComment(approvalId, briefId, {
        body: replyBody.trim(),
        commentType: replyType,
        category: 'general',
        parentId: comment.id,
      })
      setReplyBody('')
      setShowReply(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolve() {
    await resolveComment(comment.id, !comment.isResolved)
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 dark:border-gray-700 pl-4' : ''}`}>
      <div className={`rounded-lg p-3.5 ${comment.isResolved ? 'opacity-50' : ''} bg-gray-50 dark:bg-gray-800/60`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[comment.commentType]}`} />
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
              {comment.authorName}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
              {comment.authorRole}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {comment.isResolved && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {formatRelative(comment.createdAt)}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {comment.body}
        </p>

        <div className="flex items-center gap-3 mt-2.5">
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setShowReply(!showReply)}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Reply
            </button>
          )}
          <button
            type="button"
            onClick={handleResolve}
            className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {comment.isResolved ? 'Unresolve' : 'Resolve'}
          </button>
          <span className="text-[11px] text-gray-300 dark:text-gray-600 capitalize">
            {comment.category !== 'general' ? comment.category : ''}
          </span>
        </div>
      </div>

      {/* Inline reply composer */}
      {showReply && (
        <div className="ml-6 mt-2 space-y-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={2}
            placeholder="Write a reply..."
            className="w-full text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
          />
          <div className="flex items-center gap-2">
            <select
              value={replyType}
              onChange={(e) => setReplyType(e.target.value as CommentType)}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              {COMMENT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleReply}
              disabled={submitting || !replyBody.trim()}
              className="text-xs bg-brand-primary text-white px-3 py-1.5 rounded hover:bg-brand-primary/90 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
            <button
              type="button"
              onClick={() => setShowReply(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {(comment.replies ?? []).length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              approvalId={approvalId}
              briefId={briefId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface ApprovalCommentThreadProps {
  approvalId: string
  briefId: string
}

export function ApprovalCommentThread({ approvalId, briefId }: ApprovalCommentThreadProps) {
  const { addComment, getCommentsForApproval } = useApprovals()
  const [comments, setComments] = useState<ApprovalComment[]>([])
  const [body, setBody] = useState('')
  const [commentType, setCommentType] = useState<CommentType>('suggestion')
  const [category, setCategory] = useState<CommentCategory>('general')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const load = useCallback(async () => {
    setLoadingComments(true)
    try {
      const data = await getCommentsForApproval(approvalId)
      setComments(data)
    } finally {
      setLoadingComments(false)
    }
  }, [approvalId, getCommentsForApproval])

  useEffect(() => {
    load()
  }, [load])

  async function handlePost() {
    if (!body.trim()) return
    setSubmitting(true)
    try {
      await addComment(approvalId, briefId, {
        body: body.trim(),
        commentType,
        category,
      })
      setBody('')
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {loadingComments ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-primary rounded-full animate-spin" />
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic py-2">
          No comments yet. Be the first to leave feedback.
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              approvalId={approvalId}
              briefId={briefId}
            />
          ))}
        </div>
      )}

      {/* New comment composer */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2.5 bg-white dark:bg-gray-800/40 mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a comment..."
          className="w-full text-sm text-gray-800 dark:text-gray-200 bg-transparent border-none resize-none focus:outline-none placeholder-gray-400"
        />
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-gray-700">
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value as CommentType)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            {COMMENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CommentCategory)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePost}
            disabled={submitting || !body.trim()}
            className="ml-auto text-xs bg-brand-primary text-white px-4 py-1.5 rounded hover:bg-brand-primary/90 disabled:opacity-40 transition-colors"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  )
}
