import { useState, useCallback, useEffect, useRef } from 'react'
import { FormProvider } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { useBriefForm } from '../../hooks/useBriefForm'
import { useDraftPersistence } from '../../hooks/useDraftPersistence'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useSettings } from '../../contexts/SettingsContext'
import { StepIndicator } from '../ui/StepIndicator'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { TemplatePicker } from '../ui/TemplatePicker'
import { DraftsDrawer } from '../ui/DraftsDrawer'
import { SettingsPanel } from '../settings/SettingsPanel'
import { StepCampaign } from '../steps/StepCampaign'
import { StepAudience } from '../steps/StepAudience'
import { StepContent } from '../steps/StepContent'
import { StepAssets } from '../steps/StepAssets'
import { StepDeadlines } from '../steps/StepDeadlines'
import { StepBrandReview } from '../steps/StepBrandReview'
import { StepHtmlReview } from '../steps/StepHtmlReview'
import type { BriefTemplate } from '../../lib/constants'
import type { BriefFormData } from '../../lib/schema'
import { useDrafts } from '../../hooks/useDrafts'
import type { SavedDraft } from '../../hooks/useDrafts'

const TOTAL_PIPELINE_STEPS = 7
const LAST_BRIEF_STEP = 4

const STEP_LABELS = ['Campaign', 'Audience', 'Content', 'Assets', 'Deadlines']

export function FormShell() {
  const { openSettings, settings } = useSettings()
  const { senderDefaults, formDefaults } = settings

  const {
    form,
    currentStep,
    goToStep,
    handleNext,
    handleBack,
    submitBrief,
    submitStatus,
  } = useBriefForm({
    fromName: senderDefaults.fromName,
    fromAddress: senderDefaults.fromAddress,
    replyToEmail: senderDefaults.replyToEmail,
    theme: formDefaults.theme,
    urgency: formDefaults.urgency,
    emailType: formDefaults.emailType,
    includeUnsubscribe: formDefaults.includeUnsubscribe,
  })

  const { clearDraft, saveStatus } = useDraftPersistence(form)
  const { mode, setMode } = useDarkMode()
  const { drafts, saveDraft, deleteDraft, renameDraft, isOpen: isDraftsOpen, openDrawer: openDrafts, closeDrawer: closeDrafts } = useDrafts()

  const [pipelineStep, setPipelineStep] = useState<number | null>(null)
  const [highestStep, setHighestStep] = useState(0)
  // Show template picker on fresh start (no existing draft)
  const [showTemplatePicker, setShowTemplatePicker] = useState(
    () => !localStorage.getItem('ni-email-brief-draft')
  )
  const cardRef = useRef<HTMLDivElement>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)

  // Effective step: brief steps 0-4, then pipeline steps 5-6
  const effectiveStep = pipelineStep ?? currentStep

  useEffect(() => {
    setHighestStep((prev) => Math.max(prev, effectiveStep))
  }, [effectiveStep])

  // Scroll to top of card on step change
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [effectiveStep])

  useEffect(() => {
    // Focus the first heading in the new step for keyboard/screen reader users
    const heading = stepContentRef.current?.querySelector('h2, h3')
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: false })
    }
  }, [effectiveStep])

  // Unsaved-changes warning on tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus !== 'idle' || form.formState.isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus, form.formState.isDirty])

  const handleBriefSubmitAndAdvance = useCallback(async () => {
    const valid = await form.trigger()
    if (!valid) {
      // Find the first step with errors and navigate there
      const stepFields = [
        ['audience.clientGroup', 'audience.region', 'audience.channel', 'campaign.emailType', 'campaign.campaignName', 'campaign.theme', 'campaign.subjectLine', 'campaign.previewText', 'campaign.fromName', 'campaign.fromAddress', 'campaign.replyToEmail'],
        [],
        ['content.headline', 'content.bodyIntro', 'content.sections', 'content.cta', 'content.cta.label', 'content.cta.url'],
        ['assets.logoVariant', 'assets.heroImageUrl', 'assets.heroImageAlt'],
        ['deadlines.contentApprovalDate', 'deadlines.sendDate', 'deadlines.urgency'],
      ]
      const errors = form.formState.errors
      for (let i = 0; i < stepFields.length; i++) {
        const hasError = stepFields[i].some((field) => {
          const parts = field.split('.')
          let obj: unknown = errors
          for (const part of parts) {
            if (obj && typeof obj === 'object' && part in obj) {
              obj = (obj as Record<string, unknown>)[part]
            } else {
              return false
            }
          }
          return obj != null
        })
        if (hasError) {
          setPipelineStep(null)
          goToStep(i)
          return
        }
      }
      return
    }
    setPipelineStep(5)
  }, [form, goToStep])

  const handleBrandAccept = useCallback(() => {
    setPipelineStep(6) // Move to HTML Review
  }, [])

  const handleBrandDecline = useCallback(() => {
    // Go back to the last brief step (Deadlines)
    setPipelineStep(null)
    goToStep(LAST_BRIEF_STEP)
  }, [goToStep])

  const handleGoToStep = useCallback(
    (step: number) => {
      setPipelineStep(null)
      goToStep(step)
    },
    [goToStep]
  )

  const handleLoadDraft = useCallback((draft: SavedDraft) => {
    form.reset(draft.data)
    setShowTemplatePicker(false)
    setPipelineStep(null)
    goToStep(0)
    setHighestStep(0)
    closeDrafts()
  }, [form, goToStep, closeDrafts])

  const handleTemplateSelect = useCallback((tpl: BriefTemplate) => {
    form.setValue('campaign.emailType', tpl.emailType as BriefFormData['campaign']['emailType'])
    form.setValue('campaign.theme', tpl.suggestedTheme as BriefFormData['campaign']['theme'])
    form.setValue('content.modules', tpl.suggestedModules)
    form.setValue('content.includeUnsubscribe', tpl.includeUnsubscribe)
    form.setValue('content.cta.label', tpl.ctaLabel)
    form.setValue('content.sections', tpl.sectionScaffold.map((s) => ({
      id: uuidv4(),
      heading: s.heading,
      body: s.body,
      imageRequired: false,
      imageDescription: '',
    })))
    setShowTemplatePicker(false)
  }, [form])

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

  // Contextual "Continue to X" label
  const continueLabel =
    currentStep < LAST_BRIEF_STEP
      ? `Continue to ${STEP_LABELS[currentStep + 1]}`
      : 'Continue'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center py-10 px-4 transition-colors">
      <div
        ref={cardRef}
        className={`w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 py-10 px-8 transition-all duration-300 ${pipelineStep === 6 ? 'max-w-7xl' : 'max-w-3xl'}`}
      >
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
            {/* Auto-save indicator */}
            {saveStatus !== 'idle' && (
              <span className={`text-xs font-medium transition-opacity ${saveStatus === 'saving' ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}`}>
                {saveStatus === 'saving' ? 'Saving…' : 'Draft saved'}
              </span>
            )}
            <DarkModeToggle mode={mode} onModeChange={setMode} />
            {/* Drafts button */}
            <button
              type="button"
              onClick={openDrafts}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-[#134848] dark:hover:text-[#fbaa96] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              title="Saved drafts"
              aria-label="Saved drafts"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {drafts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#134848] dark:bg-[#fbaa96] text-white dark:text-gray-900 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {drafts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-[#134848] dark:hover:text-[#fbaa96] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        <StepIndicator currentStep={effectiveStep} highestStepReached={highestStep} onStepClick={handlePipelineStepClick} />

        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div ref={stepContentRef}>
              {/* Template picker — shown on fresh start */}
              {showTemplatePicker && !isPipelineStep && (
                <TemplatePicker
                  onSelect={handleTemplateSelect}
                  onSkip={() => setShowTemplatePicker(false)}
                />
              )}

              {/* Brief steps */}
              {!showTemplatePicker && !isPipelineStep && currentStep === 0 && <StepCampaign />}
              {!showTemplatePicker && !isPipelineStep && currentStep === 1 && <StepAudience />}
              {!showTemplatePicker && !isPipelineStep && currentStep === 2 && <StepContent />}
              {!showTemplatePicker && !isPipelineStep && currentStep === 3 && <StepAssets />}
              {!showTemplatePicker && !isPipelineStep && currentStep === 4 && (
                <StepDeadlines onSubmit={submitBrief} submitStatus={submitStatus} />
              )}

              {/* Pipeline steps */}
              {pipelineStep === 5 && (
                <StepBrandReview onAccept={handleBrandAccept} onDecline={handleBrandDecline} onGoToStep={handleGoToStep} />
              )}
              {pipelineStep === 6 && <StepHtmlReview onComplete={() => {
                saveDraft(form.getValues(), form.getValues().campaign.campaignName)
                clearDraft()
              }} />}
            </div>

            {/* Navigation buttons — only for brief steps (not template picker) */}
            {!isPipelineStep && !showTemplatePicker && (
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
                    Review Brief
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="bg-[#134848] text-white hover:bg-[#0d3232] px-6 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {continueLabel}
                  </button>
                )}
              </div>
            )}

            {/* Back to Brand Review from HTML */}
            {pipelineStep === 6 && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPipelineStep(5)}
                  className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-5 py-2 rounded-md text-sm font-medium transition-colors"
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

      {/* Drafts drawer */}
      <DraftsDrawer
        isOpen={isDraftsOpen}
        onClose={closeDrafts}
        drafts={drafts}
        currentData={form.getValues()}
        onSave={(data, name) => saveDraft(data, name)}
        onLoad={handleLoadDraft}
        onDelete={deleteDraft}
        onRename={renameDraft}
      />
    </div>
  )
}
