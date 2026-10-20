import { PLACEHOLDER_SUBJECT } from './tokens'
import { isTruncated } from './truncation'

export const Bar = ({ className = '', testId }: { className?: string; testId?: string }) => (
  <span data-testid={testId} className={`block h-2 rounded-full bg-[var(--preview-skeleton)] ${className}`} />
)

export const AccentBar = ({ className = '', testId }: { className?: string; testId?: string }) => (
  <span data-testid={testId} className={`block h-2 rounded-full bg-[var(--preview-accent-bar)] ${className}`} />
)

interface SubjectTextProps {
  subject: string
  limit: number
  charWidthEm: number
  testId: string
  className?: string
}

/** One line, cut off with an ellipsis at roughly `limit` characters. */
export function SubjectText({ subject, limit, charWidthEm, testId, className = '' }: SubjectTextProps) {
  const empty = subject.trim() === ''
  return (
    <span
      data-testid={testId}
      data-truncated={!empty && isTruncated(subject, limit)}
      className={`block overflow-hidden text-ellipsis whitespace-nowrap ${empty ? 'font-normal text-gray-400' : 'font-bold text-[var(--preview-text)]'} ${className}`}
      style={{ maxWidth: `${limit * charWidthEm}em` }}
    >
      {empty ? PLACEHOLDER_SUBJECT : subject}
    </span>
  )
}

export const Star = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill={filled ? 'var(--preview-accent-dot)' : 'none'}
      stroke={filled ? 'var(--preview-accent-dot)' : 'var(--preview-skeleton)'}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
)
