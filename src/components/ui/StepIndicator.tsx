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
  onStepClick: (step: number) => void
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav className="flex items-center gap-1.5 mb-8">
      {PIPELINE_LABELS.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isBrief = index <= 4
        const isPipeline = index > 4

        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (isCompleted) onStepClick(index)
            }}
            className={`flex-1 py-2 px-0.5 text-[10px] sm:text-xs font-medium rounded-full text-center transition-colors ${
              isCurrent
                ? isPipeline
                  ? 'bg-[#0a3323] text-white'
                  : 'bg-[#134848] text-white'
                : isCompleted
                  ? isBrief
                    ? 'bg-[#134848]/20 text-[#134848] cursor-pointer hover:bg-[#134848]/30'
                    : 'bg-[#0a3323]/20 text-[#0a3323] cursor-pointer hover:bg-[#0a3323]/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
            }`}
            disabled={!isCompleted}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}
