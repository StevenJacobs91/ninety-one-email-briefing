import { progressFromClick, stepProgress } from '../../lib/boardGrouping'

interface Props {
  value: number
  /** When given, the bar can be clicked (or moved with the arrow keys) to set progress in tens */
  onChange?: (value: number) => void
}

const TRACK = 'flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'
const FILL = 'h-1.5 rounded-full bg-brand-primary dark:bg-brand-accent'

/** A progress bar for the list. Editors click it to set progress to the nearest ten per cent. */
export function ProgressBar({ value, onChange }: Props) {
  const percent = <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums w-8 text-right">{value}%</span>

  if (!onChange) {
    return (
      <div className="flex items-center gap-2 min-w-[110px]">
        <div className={TRACK}><div className={FILL} style={{ width: `${value}%` }} /></div>
        {percent}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        title="Click to set progress, in steps of 10%"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          onChange(progressFromClick(e.clientX - rect.left, rect.width))
        }}
        onKeyDown={(e) => {
          const next =
            e.key === 'ArrowRight' || e.key === 'ArrowUp' ? stepProgress(value, 1)
              : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? stepProgress(value, -1)
                : e.key === 'Home' ? 0
                  : e.key === 'End' ? 100
                    : null
          if (next === null) return
          e.preventDefault()
          onChange(next)
        }}
        className="flex flex-1 items-center py-2 -my-2 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 group/bar"
      >
        <div className={`${TRACK} group-hover/bar:h-2 transition-all`}>
          <div className={`${FILL} group-hover/bar:h-2 transition-all`} style={{ width: `${value}%` }} />
        </div>
      </div>
      {percent}
    </div>
  )
}
