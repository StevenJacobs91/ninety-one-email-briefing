interface BenchmarkDeltaBadgeProps {
  direction: 'above' | 'below' | 'equal' | 'no-data'
  deltaPercent: number | null
  delta: number | null
}

export function BenchmarkDeltaBadge({ direction, delta }: BenchmarkDeltaBadgeProps) {
  if (direction === 'no-data') {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        &mdash;
      </span>
    )
  }

  if (direction === 'equal') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        =
      </span>
    )
  }

  const isAbove = direction === 'above'
  const sign = isAbove ? '+' : ''
  const ppValue = delta !== null ? `${sign}${delta.toFixed(1)}pp` : null

  const colourClasses = isAbove
    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colourClasses}`}>
      {isAbove ? (
        <svg
          className="w-3 h-3 shrink-0"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 2.5L10.5 8H1.5L6 2.5Z" />
        </svg>
      ) : (
        <svg
          className="w-3 h-3 shrink-0"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 9.5L1.5 4H10.5L6 9.5Z" />
        </svg>
      )}
      {ppValue}
    </span>
  )
}
