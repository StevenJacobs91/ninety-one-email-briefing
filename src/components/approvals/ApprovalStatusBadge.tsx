import type { ApprovalStatus } from '../../types/approval.types'

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus | 'none'
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<
  ApprovalStatus | 'none',
  { label: string; className: string } | null
> = {
  none: null,
  pending: {
    label: 'Pending Review',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  changes_requested: {
    label: 'Changes Requested',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
}

export function ApprovalStatusBadge({ status, size = 'sm' }: ApprovalStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  if (!config) return null

  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs'

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium ${textSize} ${config.className}`}
    >
      {config.label}
    </span>
  )
}
