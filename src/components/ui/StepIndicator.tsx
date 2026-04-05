const PIPELINE_LABELS = ['Brand Review', 'HTML Email'] as const

interface BriefStepConfig {
  id: string
  label: string
}

interface StepIndicatorProps {
  currentStep: number
  highestStepReached: number
  onStepClick: (step: number) => void
  briefSteps: BriefStepConfig[]
}

export function StepIndicator({
  currentStep,
  highestStepReached,
  onStepClick,
  briefSteps,
}: StepIndicatorProps) {
  const allSteps: string[] = [
    ...briefSteps.map((s) => s.label),
    ...PIPELINE_LABELS,
  ]

  return (
    <nav className="flex" aria-label="Form progress">
      {allSteps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isReachable = index <= highestStepReached
        const isPipeline = index >= briefSteps.length

        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => {
              if (isReachable && !isCurrent) onStepClick(index)
            }}
            disabled={!isReachable || isCurrent}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`Step ${index + 1}: ${label}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
            className={`relative flex items-center gap-2 px-4 py-4 text-xs font-ni-heading tracking-[0.12em] uppercase whitespace-nowrap transition-colors border-b-[3px] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent ${
              isCurrent
                ? 'text-brand-primary dark:text-brand-accent border-brand-primary dark:border-brand-accent'
                : isCompleted
                  ? 'text-brand-primary/60 dark:text-brand-accent/60 border-transparent cursor-pointer hover:text-brand-primary dark:hover:text-brand-accent'
                  : isReachable
                    ? 'text-gray-400 dark:text-gray-500 border-transparent cursor-pointer hover:text-gray-600 dark:hover:text-gray-300'
                    : 'text-gray-300 dark:text-gray-600 border-transparent cursor-default'
            }`}
          >
            {/* Step number circle */}
            {isCompleted ? (
              <span className="w-5 h-5 rounded-full bg-brand-success flex items-center justify-center shrink-0" aria-hidden="true">
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              </span>
            ) : (
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isCurrent
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`} aria-hidden="true">
                {index + 1}
              </span>
            )}
            {/* Label — hide pipeline labels on small screens, hide brief labels after 2nd on very small */}
            <span className={isPipeline ? 'hidden sm:inline' : index >= 2 ? 'hidden sm:inline' : ''}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
