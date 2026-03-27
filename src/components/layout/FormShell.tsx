import { useState, useCallback } from 'react'
import { FormProvider } from 'react-hook-form'
import { useBriefForm } from '../../hooks/useBriefForm'
import { useDraftPersistence } from '../../hooks/useDraftPersistence'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useSettings } from '../../contexts/SettingsContext'
import { StepIndicator } from '../ui/StepIndicator'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { SettingsPanel } from '../settings/SettingsPanel'
import { StepCampaign } from '../steps/StepCampaign'
import { StepAudience } from '../steps/StepAudience'
import { StepContent } from '../steps/StepContent'
import { StepAssets } from '../steps/StepAssets'
import { StepDeadlines } from '../steps/StepDeadlines'
import { StepBrandReview } from '../steps/StepBrandReview'
import { StepHtmlReview } from '../steps/StepHtmlReview'

const TOTAL_PIPELINE_STEPS = 7
const LAST_BRIEF_STEP = 4

export function FormShell() {
  const {
    form,
    currentStep,
    goToStep,
    handleNext,
    handleBack,
    submitBrief,
    submitStatus,
  } = useBriefForm()

  useDraftPersistence(form)
  const { mode, setMode } = useDarkMode()
  const { openSettings } = useSettings()

  const [pipelineStep, setPipelineStep] = useState<number | null>(null)

  // Effective step: brief steps 0-4, then pipeline steps 5-6
  const effectiveStep = pipelineStep ?? currentStep

  const handleBriefSubmitAndAdvance = useCallback(async () => {
    // Validate all fields first
    const valid = await form.trigger()
    if (!valid) return
    setPipelineStep(5) // Move to Brand Guardian
  }, [form])

  const handleBrandAccept = useCallback(() => {
    setPipelineStep(6) // Move to HTML Review
  }, [])

  const handleBrandDecline = useCallback(() => {
    // Go back to the last brief step (Deadlines)
    setPipelineStep(null)
    goToStep(LAST_BRIEF_STEP)
  }, [goToStep])

  const handlePipelineStepClick = useCallback(
    (step: number) => {
      if (step <= LAST_BRIEF_STEP) {
        setPipelineStep(null)
        goToStep(step)
      } else if (step < (pipelineStep ?? TOTAL_PIPELINE_STEPS)) {
        setPipelineStep(step)
      }
    },
    [goToStep, pipelineStep]
  )

  const isFirstStep = effectiveStep === 0
  const isLastBriefStep = effectiveStep === LAST_BRIEF_STEP
  const isPipelineStep = pipelineStep !== null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center py-10 px-4 transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 py-10 px-8 transition-colors">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#134848] dark:text-[#fbaa96]">Ninety One Email Briefing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isPipelineStep
                ? 'Review and export your brand-compliant HTML email.'
                : 'Complete all steps to generate a production-ready email brief.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle mode={mode} onModeChange={setMode} />
            <button
              type="button"
              onClick={openSettings}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-[#134848] dark:hover:text-[#fbaa96] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        <StepIndicator currentStep={effectiveStep} onStepClick={handlePipelineStepClick} />

        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Brief steps */}
            {!isPipelineStep && currentStep === 0 && <StepCampaign />}
            {!isPipelineStep && currentStep === 1 && <StepAudience />}
            {!isPipelineStep && currentStep === 2 && <StepContent />}
            {!isPipelineStep && currentStep === 3 && <StepAssets />}
            {!isPipelineStep && currentStep === 4 && (
              <StepDeadlines onSubmit={submitBrief} submitStatus={submitStatus} />
            )}

            {/* Pipeline steps */}
            {pipelineStep === 5 && (
              <StepBrandReview onAccept={handleBrandAccept} onDecline={handleBrandDecline} />
            )}
            {pipelineStep === 6 && <StepHtmlReview />}

            {/* Navigation buttons — only for brief steps */}
            {!isPipelineStep && (
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                {!isFirstStep ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-5 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {isLastBriefStep ? (
                  <button
                    type="button"
                    onClick={handleBriefSubmitAndAdvance}
                    className="bg-[#0a3323] text-white hover:bg-[#071f15] px-6 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Submit Brief &amp; Review
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#134848] text-white hover:bg-[#0d3232] px-6 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}

            {/* Back to Brand Review from HTML */}
            {pipelineStep === 6 && (
              <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPipelineStep(5)}
                  className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-5 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Back to Brand Review
                </button>
              </div>
            )}
          </form>
        </FormProvider>
      </div>

      {/* Settings drawer */}
      <SettingsPanel />
    </div>
  )
}
