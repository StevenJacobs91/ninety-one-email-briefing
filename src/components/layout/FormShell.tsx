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
import { StepReview } from '../steps/StepReview'
import { StepBrandReview } from '../steps/StepBrandReview'
import { StepHtmlReview } from '../steps/StepHtmlReview'
import type { BriefTemplate } from '../../lib/constants'
import { BRAND_THEMES } from '../../lib/constants'
import type { BriefFormData } from '../../lib/schema'
import { useDrafts } from '../../hooks/useDrafts'
import type { SavedDraft } from '../../hooks/useDrafts'

function NinetyOneLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 98 48" aria-label="Ninety One" className={className}>
      <path fill="white" d="M19 0v48h-9V0h9zm10 0v48h-9V0h9zm40.559 24.004c.37 0 .624.023.994.138l3.859 2.815c.37.807.578 1.776.578 2.907v.784h-9.014c.07 2.214 1.526 3.506 3.606 3.506 1.803 0 2.981-.945 3.397-2.33l1.756.577C73.973 34.616 72.193 36 69.56 36c-3.513 0-5.64-2.4-5.64-5.998 0-3.599 2.612-5.998 5.64-5.998zm-28.517-4.707c.555 0 1.11.047 1.641.162l5.385 3.899c.647 1.2 1.017 2.652 1.017 4.244 0 4.96-3.56 8.305-8.043 8.305-4.483 0-8.042-3.345-8.042-8.305 0-4.96 3.559-8.305 8.042-8.305zm16.454 4.707c.139 0 .3 0 .439.023l3.305 2.4c.139.414.208.876.208 1.383v7.96h-2.034v-7.59c0-1.523-.832-2.377-2.357-2.377-1.41 0-2.612.97-3.467 2.215v7.751h-2.033V24.235h2.033v1.5c.81-.854 2.335-1.731 3.906-1.731zm-16.454-2.677c-3.536 0-5.777 2.584-5.777 6.275 0 3.691 2.241 6.275 5.777 6.275s5.778-2.584 5.778-6.275c0-3.69-2.242-6.275-5.778-6.275zM69.56 25.85c-1.803 0-3.236 1.108-3.56 3.046h7.072c-.161-2.03-1.71-3.046-3.512-3.046zM9 0v24H0V0h9zm80.172 4.615l3.097 7.359.3 1.407 3.374-8.766H98l-6.517 16.379-1.78-.577 1.919-4.775-4.576-11.027h2.126zm-8.618-3.462l2.034.67v2.791h2.773l-.6 1.845h-2.173v6.875c0 .761.439 1.246 1.317 1.246.393 0 .763-.093 1.271-.346l.532 1.615c-.855.392-1.526.53-2.311.53-1.757 0-2.843-.992-2.843-2.907V6.46h-2.288l.601-1.845h1.687v-3.46zm-8.9 3.23c.37 0 .625.023.994.139l3.86 2.814c.37.807.578 1.776.578 2.907v.784h-9.014c.07 2.215 1.526 3.507 3.606 3.507 1.803 0 2.981-.946 3.397-2.33l1.756.576c-.762 2.215-2.542 3.6-5.176 3.6-3.513 0-5.64-2.4-5.64-5.999 0-3.599 2.612-5.998 5.64-5.998zm-11.836 0c.139 0 .3 0 .44.023l3.304 2.4c.139.415.208.876.208 1.384v7.958h-2.034v-7.59c0-1.522-.832-2.375-2.357-2.375-1.41 0-2.611.968-3.466 2.214v7.751h-2.034V4.614h2.034v1.5c.809-.854 2.334-1.73 3.905-1.73zm-8.831.231v11.535h-2.034V4.614h2.034zM36.4 0l7.441 12.665V0h2.22v16.148h-2.497L36.124 3.483v12.665h-2.219V0h2.496zm35.254 6.229c-1.803 0-3.236 1.107-3.56 3.045h7.072c-.161-2.03-1.71-3.045-3.512-3.045zM49.97.118a1.37 1.37 0 0 1 0 2.74 1.37 1.37 0 1 1 0-2.74z" />
      <path fill="#fbaa96" d="M19 24v24h-9V24h9zm10 0v24h-9V24h9z" />
    </svg>
  )
}

const STEP_HELP = [
  {
    title: 'Setting up your campaign',
    body: 'Define the email type, subject line, and brand theme. These fields control how your email is categorised and how recipients experience it in their inbox.',
    tips: [
      'Subject lines under 50 characters perform best across email clients',
      'Preview text should complement the subject — not repeat it',
      'Your brand theme controls the full colour palette of the generated email',
    ],
  },
  {
    title: 'Building your audience',
    body: 'Upload a distribution list, select target regions and channels, and optionally link a Pardot list for automated send workflows.',
    tips: [
      'Upload a CSV with at minimum an email column — first and last name improve personalisation',
      'Select all regions that apply — legal disclaimers are applied per-region automatically',
      'A Pardot List ID is only required for automated sends via the n8n workflow integration',
    ],
  },
  {
    title: 'Writing your content',
    body: 'Craft your headline, body introduction, and content sections. Use the rich text tools for brand-consistent inline formatting.',
    tips: [
      'Headlines under 80 characters render cleanly across most email clients',
      'Add between 1 and 4 content sections to structure longer emails',
      'Bold and linked text in the editor will appear correctly in the generated HTML',
    ],
  },
  {
    title: 'Reviewing your brief',
    body: 'Check all the details you have entered before generating the HTML email. Export the brief as JSON or PDF for your records.',
    tips: [
      'Download or copy the JSON to share the brief with your production team',
      'Use Print / PDF to generate a formatted PDF version of your brief',
      'Once you proceed, the brief will be validated against Ninety One brand standards',
    ],
  },
  {
    title: 'Reviewing for compliance',
    body: 'Check that your brief meets Ninety One brand standards before generating the HTML email. Address any flagged issues before proceeding.',
    tips: [],
  },
  {
    title: 'Your production email',
    body: 'Review and export your brand-compliant HTML email. Copy or download it for use in your send platform.',
    tips: [],
  },
]

interface HelpPanelProps {
  step: number
  currentTheme: string
  onChangeTemplate?: () => void
}

function HelpPanel({ step, currentTheme, onChangeTemplate }: HelpPanelProps) {
  const help = STEP_HELP[Math.min(step, STEP_HELP.length - 1)]
  const theme = BRAND_THEMES.find((t) => t.id === currentTheme)
  const stepLabels = ['Campaign', 'Audience', 'Content', 'Review your Brief']
  const eyebrow = step < 4 ? `Step ${step + 1} of 4 · ${stepLabels[step]}` : step === 4 ? 'Pipeline · Brand Review' : 'Pipeline · HTML Email'

  return (
    <aside className="help-panel-sticky w-full space-y-4">
      {/* Step guide */}
      <div className="bg-brand-bg-panel dark:bg-brand-bg-panel-dark border border-brand-border-warm dark:border-gray-700 p-7">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
          <p className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">Step Guide</p>
        </div>
        <p className="text-xs tracking-[0.15em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-2">{eyebrow}</p>
        <h2 className="font-ni-display text-brand-primary dark:text-brand-accent text-xl leading-snug mb-3">{help.title}</h2>
        <p className="text-brand-text-body dark:text-gray-300 text-sm leading-relaxed">{help.body}</p>
        {help.tips.length > 0 && (
          <>
            <div className="my-5 h-px bg-brand-border-warm dark:bg-gray-700" />
            <ul className="space-y-3">
              {help.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-brand-text-body dark:text-gray-300 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Active brand theme swatch */}
      {theme && step < 4 && (
        <div className="bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 p-5">
          <p className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-4">Active Brand Theme</p>
          <div className="flex items-start gap-3">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-7 h-7 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: theme.primary }} />
              <span className="w-7 h-7 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: theme.accent }} />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-ni-heading text-brand-primary dark:text-gray-200 leading-tight"
                title={theme.label}
              >
                {theme.label}
              </p>
              <p className="text-xs text-brand-text-muted dark:text-gray-500 mt-0.5">{theme.primary} · {theme.accent}</p>
            </div>
          </div>
        </div>
      )}

      {/* Change template — only on step 0 */}
      {step === 0 && onChangeTemplate && (
        <button
          type="button"
          onClick={onChangeTemplate}
          className="w-full text-xs text-brand-text-muted dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-brand-border-warm dark:border-gray-700 py-2.5 transition-colors"
        >
          Change template
        </button>
      )}
    </aside>
  )
}

const TOTAL_PIPELINE_STEPS = 6
const LAST_BRIEF_STEP = 3

const STEP_LABELS = ['Campaign', 'Audience', 'Content', 'Review your Brief']

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
  const [showTemplatePicker, setShowTemplatePicker] = useState(
    () => !localStorage.getItem('ni-email-brief-draft')
  )
  const cardRef = useRef<HTMLDivElement>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)

  const effectiveStep = pipelineStep ?? currentStep

  useEffect(() => {
    setHighestStep((prev) => Math.max(prev, effectiveStep))
  }, [effectiveStep])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [effectiveStep])

  useEffect(() => {
    const heading = stepContentRef.current?.querySelector('h2, h3')
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: false })
    }
  }, [effectiveStep])

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
      const stepFields = [
        ['audience.clientGroup', 'audience.region', 'audience.channel', 'campaign.emailType', 'campaign.campaignName', 'campaign.theme', 'campaign.subjectLine', 'campaign.previewText', 'campaign.fromName', 'campaign.fromAddress', 'campaign.replyToEmail', 'assets.logoVariant', 'assets.heroImageUrl', 'assets.heroImageAlt', 'deadlines.contentApprovalDate', 'deadlines.sendDate', 'deadlines.urgency'],
        [],
        ['content.headline', 'content.bodyIntro', 'content.sections', 'content.cta', 'content.cta.label', 'content.cta.url'],
        [],
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
    setPipelineStep(4)
  }, [form, goToStep])

  const handleBrandAccept = useCallback(() => {
    setPipelineStep(5)
  }, [])

  const handleBrandDecline = useCallback(() => {
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

  const handleChangeTemplate = useCallback(() => {
    setShowTemplatePicker(true)
    setPipelineStep(null)
    goToStep(0)
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

  const currentTheme = form.watch('campaign.theme')

  return (
    <div className="min-h-screen bg-brand-bg-warm dark:bg-[#1a1714] flex flex-col">
      {/* ── Sticky navigation bar ── */}
      <header className="sticky top-0 z-40 bg-brand-primary dark:bg-brand-primary-dark">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo + platform label */}
          <div className="flex items-center gap-0 shrink-0">
            <NinetyOneLogo className="h-5 w-auto" />
            <div className="ml-4 pl-4 border-l border-white/20 hidden sm:block">
              <span className="text-white/70 text-xs tracking-[0.2em] uppercase font-ni-heading">Email Briefing Platform</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Desktop nav items */}
            <nav className="hidden md:flex items-center mr-3" aria-label="Platform navigation">
              <span className="relative text-white text-xs tracking-[0.12em] uppercase font-ni-heading px-4 py-4 opacity-100 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:bg-brand-accent after:content-['']">
                Email Briefing
              </span>
              <button
                type="button"
                onClick={openDrafts}
                className="group relative text-white/70 hover:text-white text-xs tracking-[0.12em] uppercase font-ni-heading px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"
              >
                Drafts
                {drafts.length > 0 && <span className="ml-1 text-brand-accent">({drafts.length})</span>}
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="group relative text-white/70 hover:text-white text-xs tracking-[0.12em] uppercase font-ni-heading px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"
              >
                Settings
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" aria-hidden="true" />
              </button>
            </nav>

            {/* Save status — always present so layout doesn't shift */}
            <span
              className={`text-xs mr-2 min-w-[52px] text-right transition-opacity ${
                saveStatus === 'idle'
                  ? 'opacity-0'
                  : saveStatus === 'saving'
                    ? 'text-white/50'
                    : 'text-brand-accent'
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
            </span>

            <DarkModeToggle mode={mode} onModeChange={setMode} />

            {/* Mobile icon buttons */}
            <div className="flex items-center gap-0.5 md:hidden ml-1">
              <button
                type="button"
                onClick={openDrafts}
                className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-label="Saved drafts"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {drafts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-brand-accent text-brand-primary text-[8px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                    {drafts.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-label="Settings"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Coral accent line */}
        <div className="h-[2px] bg-brand-accent/50" aria-hidden="true" />
      </header>

      {/* ── Hero band — compact on interior steps ── */}
      <div className={`bg-brand-primary dark:bg-brand-primary-dark px-4 ${showTemplatePicker ? 'py-8' : 'py-5'}`}>
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-6">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1.5">Marketing Operations</p>
            <h1 className={`font-ni-display text-white leading-none tracking-tight ${showTemplatePicker ? 'text-4xl lg:text-5xl' : 'text-2xl lg:text-3xl'}`}>
              Email Briefing
            </h1>
            {showTemplatePicker && (
              <p className="text-white/60 text-sm mt-2">
                Create brand-compliant HTML emails for Ninety One marketing campaigns.
              </p>
            )}
          </div>
          {!showTemplatePicker && (
            <div className="text-right hidden sm:block shrink-0">
              {!isPipelineStep ? (
                <>
                  <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">Current Step</p>
                  <p className="font-ni-display leading-none">
                    <span className="text-brand-accent text-3xl">{currentStep + 1}</span>
                    <span className="text-white/30 text-2xl mx-1.5">/</span>
                    <span className="text-white/50 text-2xl">4</span>
                  </p>
                  <p className="text-white/50 text-xs uppercase tracking-[0.18em] mt-1.5 font-ni-heading">{STEP_LABELS[currentStep]}</p>
                </>
              ) : (
                <>
                  <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">Pipeline</p>
                  <p className="font-ni-display text-white text-xl leading-none">
                    {pipelineStep === 4 ? 'Brand Review' : 'HTML Email'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Step tabs (sticky below nav) ── */}
      <div className="sticky top-14 z-30 bg-white dark:bg-gray-900 border-b border-brand-border-warm dark:border-gray-700 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6">
          <StepIndicator
            currentStep={effectiveStep}
            highestStepReached={highestStep}
            onStepClick={handlePipelineStepClick}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div ref={cardRef} className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <FormProvider {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            {showTemplatePicker && !isPipelineStep ? (
              /* Template picker — full width */
              <div ref={stepContentRef}>
                <TemplatePicker
                  onSelect={handleTemplateSelect}
                  onSkip={() => setShowTemplatePicker(false)}
                />
              </div>
            ) : (
              /* Two-column on lg+: form card + help panel. Single column on md and below. */
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Form card */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700">
                  <div ref={stepContentRef} className="p-8 lg:p-10">
                    {!isPipelineStep && currentStep === 0 && <StepCampaign />}
                    {!isPipelineStep && currentStep === 1 && <StepAudience />}
                    {!isPipelineStep && currentStep === 2 && <StepContent />}
                    {!isPipelineStep && currentStep === 3 && (
                      <StepReview onSubmit={submitBrief} submitStatus={submitStatus} />
                    )}
                    {pipelineStep === 4 && (
                      <StepBrandReview
                        onAccept={handleBrandAccept}
                        onDecline={handleBrandDecline}
                        onGoToStep={handleGoToStep}
                      />
                    )}
                    {pipelineStep === 5 && (
                      <StepHtmlReview
                        onComplete={() => {
                          saveDraft(form.getValues(), form.getValues().campaign.campaignName)
                          clearDraft()
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Help panel — full width on < lg, fixed sidebar on lg+ */}
                <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0">
                  <HelpPanel
                    step={effectiveStep}
                    currentTheme={currentTheme}
                    onChangeTemplate={!isPipelineStep && currentStep === 0 ? handleChangeTemplate : undefined}
                  />
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      </div>

      {/* ── Sticky footer navigation — brief steps only ── */}
      {!isPipelineStep && !showTemplatePicker && (
        <footer className="sticky bottom-0 z-30 bg-white dark:bg-gray-900 border-t border-brand-border-warm dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handleBack}
                className="min-h-[44px] flex items-center gap-2 text-sm font-ni-heading text-brand-primary dark:text-brand-accent tracking-wide hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent px-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to {STEP_LABELS[currentStep - 1]}
              </button>
            ) : (
              <div />
            )}
            <span className="text-xs text-brand-text-muted dark:text-gray-500 hidden sm:block">
              Step <strong className="text-gray-700 dark:text-gray-300">{currentStep + 1}</strong> of <strong className="text-gray-700 dark:text-gray-300">4</strong>
            </span>
            {isLastBriefStep ? (
              <button
                type="button"
                onClick={handleBriefSubmitAndAdvance}
                className="min-h-[44px] flex items-center gap-2 bg-brand-primary text-white px-7 py-3 text-xs font-ni-heading tracking-[0.15em] uppercase hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                Review Brief
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] flex items-center gap-2 bg-brand-primary text-white px-7 py-3 text-xs font-ni-heading tracking-[0.15em] uppercase hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                Continue to {STEP_LABELS[currentStep + 1]}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Pipeline step 5 footer */}
      {pipelineStep === 5 && (
        <footer className="sticky bottom-0 z-30 bg-white dark:bg-gray-900 border-t border-brand-border-warm dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
            <button
              type="button"
              onClick={() => setPipelineStep(4)}
              className="min-h-[44px] flex items-center gap-2 text-sm font-ni-heading text-brand-primary dark:text-brand-accent tracking-wide hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent px-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Brand Review
            </button>
            <button
              type="button"
              onClick={() => { setPipelineStep(null); goToStep(0) }}
              className="min-h-[44px] flex items-center gap-2 text-sm font-ni-heading text-brand-text-muted dark:text-gray-500 tracking-wide hover:text-brand-primary dark:hover:text-brand-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent px-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Return to Brief
            </button>
          </div>
        </footer>
      )}

      {/* Drawers */}
      <SettingsPanel />
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
