import type { RiskLevel } from '../../lib/audienceHealthService'

interface RiskBadgeProps {
  level: RiskLevel | null
  size?: 'sm' | 'md'
}

const COLOR_MAP: Record<RiskLevel, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const SIZE_MAP: Record<'sm' | 'md', string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  if (level === null) return null

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium capitalize',
        COLOR_MAP[level],
        SIZE_MAP[size],
      ].join(' ')}
    >
      {level}
    </span>
  )
}
