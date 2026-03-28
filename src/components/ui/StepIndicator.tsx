const PIPELINE_LABELS = [
  'Campaign',
  'Audience',
  'Content',
  'Assets',
  'Deadlines',
  'Brand Review',
  'HTML Email',
] as const

interface StepIndicatorProps {
  currentStep: number
  highestStepReached: number
  onStepClick: (step: number) => void
}

export function StepIndicator({ currentStep, highestStepReached, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="flex" aria-label="Form progress">
      {PIPELINE_LABELS.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isReachable = index <= highestStepReached
        const isPipeline = index > 4

        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (isReachable && !isCurrent) onStepClick(index)
            }}
            disabled={!isReachable || isCurrent}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Step ${index + 1}: ${label}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            className={`relative flex items-center gap-2 px-4 py-3.5 text-[11px] font-ni-heading tracking-[0.12em] uppercase whitespace-nowrap transition-colors border-b-[3px] ${
              isCurrent
                ? isPipeline
                  ? 'text-[#0a3323] dark:text-[#fbaa96] border-[#0a3323] dark:border-[#fbaa96]'
                  : 'text-[#134848] dark:text-[#fbaa96] border-[#134848] dark:border-[#fbaa96]'
                : isCompleted
                  ? 'text-[#134848]/60 dark:text-[#fbaa96]/60 border-transparent cursor-pointer hover:text-[#134848] dark:hover:text-[#fbaa96]'
                  : isReachable
                    ? 'text-gray-400 dark:text-gray-500 border-transparent cursor-pointer hover:text-gray-600 dark:hover:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600 border-transparent cursor-default'
            }`}
          >
            {/* Step number circle */}
            {isCompleted ? (
              <span className="w-4 h-4 rounded-full bg-[#009d80] flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              </span>
            ) : (
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                isCurrent
                  ? isPipeline
                    ? 'bg-[#0a3323] text-white'
                    : 'bg-[#134848] text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {index + 1}
              </span>
            )}
            {/* Label — hide some on small screens */}
            <span className={index >= 5 ? 'hidden lg:inline' : index >= 3 ? 'hidden sm:inline' : ''}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
