import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { FormProvider } from 'react-hook-form'
import { v4 as uuidv4 } from 'uuid'
import { useBriefForm } from '../../hooks/useBriefForm'
import { useDraftPersistence } from '../../hooks/useDraftPersistence'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useKanban } from '../../contexts/KanbanContext'
import { StepIndicator } from '../ui/StepIndicator'
import { DarkModeToggle } from '../ui/DarkModeToggle'
import { TemplatePicker } from '../ui/TemplatePicker'
import { DraftsDrawer } from '../ui/DraftsDrawer'
import { SettingsPanel } from '../settings/SettingsPanel'
import { StepCampaign } from '../steps/StepCampaign'
// StepAudience merged into StepCampaign — audience section is now part of Campaign step
import { StepContent } from '../steps/StepContent'
import { StepReview } from '../steps/StepReview'
import { StepBrandReview } from '../steps/StepBrandReview'
import { StepHtmlReview } from '../steps/StepHtmlReview'
import { CampaignInsightsSlideOver } from '../steps/CampaignInsightsSlideOver'
import { KanbanBoard } from '../kanban/KanbanBoard'
import { ApprovalsPanel } from '../approvals/ApprovalsPanel'
import { useApprovals } from '../../contexts/ApprovalsContext'
import type { BriefTemplate } from '../../lib/constants'
import { BRAND_THEMES } from '../../lib/constants'
import type { BriefFormData } from '../../lib/schema'
import { useDrafts } from '../../hooks/useDrafts'
import type { SavedDraft } from '../../hooks/useDrafts'
import { useAuditLog } from '../../hooks/useAuditLog'
import { buildEmailName } from '../../lib/emailName'
import { getStepFields } from '../../lib/validateStep'


const STEP_HELP_BY_ID: Record<string, { title: string; body: string; tips: string[] }> = {
  campaign: {
    title: 'Setting up your campaign',
    body: 'Define the campaign details, target audience, email type, subject line, and brand theme. These fields control how your email is categorised, who receives it, and how recipients experience it in their inbox.',
    tips: [
      'Subject lines under 50 characters perform best across email clients',
      'Preview text should complement the subject — not repeat it',
      'Select all regions and channels that apply — legal disclaimers are applied per-region automatically',
      'Your brand theme controls the full colour palette of the generated email',
    ],
  },
  content: {
    title: 'Writing your content',
    body: 'Craft your headline, body introduction, and content sections. Use the rich text tools for brand-consistent inline formatting.',
    tips: [
      'Headlines under 80 characters render cleanly across most email clients',
      'Add between 1 and 4 content sections to structure longer emails',
      'Bold and linked text in the editor will appear correctly in the generated HTML',
    ],
  },
  review: {
    title: 'Reviewing your brief',
    body: 'Check all the details you have entered before generating the HTML email. Export the brief as JSON or PDF for your records.',
    tips: [
      'Download or copy the JSON to share the brief with your production team',
      'Use Print / PDF to generate a formatted PDF version of your brief',
      'Once you proceed, the brief will be validated against Ninety One brand standards',
    ],
  },
  'brand-review': {
    title: 'Reviewing for compliance',
    body: 'Check that your brief meets Ninety One brand standards before generating the HTML email. Address any flagged issues before proceeding.',
    tips: [],
  },
  'html-email': {
    title: 'Your production email',
    body: 'Review and export your brand-compliant HTML email. Copy or download it for use in your send platform.',
    tips: [],
  },
}

interface HelpPanelProps {
  stepId: string
  currentStepIndex: number
  totalBriefSteps: number
  currentTheme: string
  onChangeTemplate?: () => void
  campaignName?: string
  onOpenInsights?: () => void
}

function HelpPanel({ stepId, currentStepIndex, totalBriefSteps, currentTheme, onChangeTemplate, campaignName, onOpenInsights }: HelpPanelProps) {
  const { settings } = useSettings()
  const help = STEP_HELP_BY_ID[stepId] ?? STEP_HELP_BY_ID['campaign']
  const theme = BRAND_THEMES.find((t) => t.id === currentTheme)
  const isPipeline = stepId === 'brand-review' || stepId === 'html-email'
  const eyebrow = isPipeline
    ? `Pipeline · ${stepId === 'brand-review' ? 'Brand Review' : 'HTML Email'}`
    : `Step ${currentStepIndex + 1} of ${totalBriefSteps} · ${help.title}`

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
      {theme && !isPipeline && (
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

      {/* Campaign Insights summary — shown on Campaign step when a campaign is selected and insights enabled */}
      {stepId === 'campaign' && campaignName && settings.campaignInsights?.enabled !== false && (
        <div className="bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="shrink-0 w-6 h-6 rounded-md bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <p className="text-xs tracking-[0.15em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400">Campaign Insights</p>
          </div>
          <p className="text-sm font-ni-heading text-brand-primary dark:text-gray-200 leading-tight mb-2 truncate" title={campaignName}>
            {campaignName}
          </p>

          {/* Key metrics — dummy data */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-md p-2.5">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">5.2%</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Avg Unique CTR</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-md p-2.5">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">3,240</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Avg Delivered</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-md p-2.5">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">+12%</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">CTR Trend</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-md p-2.5">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">5</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Recent Sends</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3 leading-relaxed">
            Simulated data. Connect the Pardot API in Settings for live metrics.
          </p>

          {onOpenInsights && (
            <button
              type="button"
              onClick={onOpenInsights}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white text-xs font-medium py-2 rounded-md hover:bg-teal-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Campaign Insights & Recommendations
            </button>
          )}
        </div>
      )}

      {/* Change template — only on Campaign step */}
      {stepId === 'campaign' && onChangeTemplate && (
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

// Pipeline steps are always the last 2 (Brand Review + HTML Email).
// Brief step count and labels are dynamic from settings.formSteps.

export function FormShell() {
  const { openSettings, settings, loading: settingsLoading } = useSettings()
  const { senderDefaults, formDefaults } = settings
  const { profile, user, signOut } = useAuth()
  const { addCard, cards, loading: kanbanLoading } = useKanban()
  const { pendingCount } = useApprovals()

  // Derive visible brief steps from settings, sorted by order
  const visibleBriefSteps = useMemo(
    () => [...settings.formSteps].sort((a, b) => a.order - b.order).filter((s) => s.visible),
    [settings.formSteps]
  )
  const lastBriefStep = Math.max(0, visibleBriefSteps.length - 1)

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
  }, {
    teamId: profile?.teamId,
    userId: user?.id,
  }, visibleBriefSteps.length || 3)

  const { clearDraft, saveStatus } = useDraftPersistence(form)
  const { mode, setMode } = useDarkMode()
  const { drafts, saveDraft, deleteDraft, renameDraft, isOpen: isDraftsOpen, openDrawer: openDrafts, closeDrawer: closeDrafts } = useDrafts()
  const { log: audit } = useAuditLog()

  const [pipelineStep, setPipelineStep] = useState<number | null>(null)
  const [highestStep, setHighestStep] = useState(0)
  const [showTemplatePicker, setShowTemplatePicker] = useState(
    () => !localStorage.getItem('ni-email-brief-draft')
  )
  const [showBoard, setShowBoard] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showApprovals, setShowApprovals] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)

  // Current step id ('campaign' | 'content' | 'review') for brief steps,
  // or 'brand-review' / 'html-email' for pipeline steps.
  const currentBriefStepId = visibleBriefSteps[currentStep]?.id ?? 'campaign'
  const currentStepId = pipelineStep === 3
    ? 'brand-review'
    : pipelineStep === 4
      ? 'html-email'
      : currentBriefStepId

  // Index within the step indicator (brief steps first, then pipeline)
  const indicatorStep = pipelineStep != null
    ? visibleBriefSteps.length + (pipelineStep - 3)
    : currentStep

  const handleSignOut = useCallback(() => {
    audit({ action: 'Signed out', category: 'auth' })
    signOut()
  }, [signOut, audit])

  useEffect(() => {
    setHighestStep((prev) => Math.max(prev, indicatorStep))
  }, [indicatorStep])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [indicatorStep])

  useEffect(() => {
    const heading = stepContentRef.current?.querySelector('h2, h3')
    if (heading instanceof HTMLElement) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: false })
    }
  }, [indicatorStep])

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
      const errors = form.formState.errors
      for (let i = 0; i < visibleBriefSteps.length; i++) {
        const fields = getStepFields(visibleBriefSteps[i].id)
        const hasError = fields.some((field) => {
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
    const values = form.getValues()
    const briefId = values.meta?.briefId
    const alreadyOnBoard = briefId ? cards.some((c) => c.briefId === briefId) : false
    if (!alreadyOnBoard) {
      addCard(values)
      audit({
        action: 'Submitted brief to board',
        category: 'brief',
        entityType: 'brief',
        entityId: briefId,
        details: { campaignName: values.campaign.campaignName, emailType: values.campaign.emailType },
      })
    }
    setPipelineStep(3)
  }, [form, goToStep, addCard, cards, audit, visibleBriefSteps])

  const handleBrandAccept = useCallback(() => {
    setPipelineStep(4)
  }, [])

  const handleBrandDecline = useCallback(() => {
    setPipelineStep(null)
    goToStep(lastBriefStep)
  }, [goToStep, lastBriefStep])

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
    (indicatorIdx: number) => {
      if (indicatorIdx < visibleBriefSteps.length) {
        // Brief step — navigate by position
        setPipelineStep(null)
        goToStep(indicatorIdx)
      } else {
        // Pipeline step — remap indicator index back to raw pipeline step (3 or 4)
        const rawPipelineStep = 3 + (indicatorIdx - visibleBriefSteps.length)
        if (rawPipelineStep < (pipelineStep ?? visibleBriefSteps.length + 10)) {
          setPipelineStep(rawPipelineStep)
        }
      }
    },
    [goToStep, pipelineStep, visibleBriefSteps.length]
  )

  const isFirstStep = currentStep === 0
  const isLastBriefStep = currentStep === lastBriefStep
  const isPipelineStep = pipelineStep !== null

  const currentTheme = form.watch('campaign.theme')
  const watchedCampaignName = form.watch('campaign.campaignName') ?? ''
  const watchedRegions = form.watch('audience.region') ?? []
  const watchedChannels = form.watch('audience.channel') ?? []
  const watchedDescription = form.watch('campaign.emailDescription') ?? ''

  if (settingsLoading || kanbanLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm dark:bg-[#1a1714] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading platform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg-warm dark:bg-[#1a1714] flex flex-col">
      {/* ── Sticky navigation bar ── */}
      <header className="sticky top-0 z-40 bg-brand-primary dark:bg-brand-primary-dark">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo + platform label */}
          <div className="flex items-center gap-0 shrink-0">
            <img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" className="h-5 w-auto" />
            <div className="ml-4 pl-4 border-l border-white/20 hidden sm:block">
              <span className="text-white/70 text-xs tracking-[0.2em] uppercase font-ni-heading">Email Briefing Platform</span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Desktop nav icons */}
            <nav className="hidden md:flex items-center gap-0.5 mr-2" aria-label="Platform navigation">
              {/* Board */}
              <button
                type="button"
                onClick={() => setShowBoard(!showBoard)}
                title="Campaign board"
                aria-label="Campaign board"
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${showBoard ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="10" rx="1" />
                  <rect x="14" y="17" width="7" height="4" rx="1" />
                </svg>
                {cards.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-accent text-brand-primary text-[8px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                    {cards.length}
                  </span>
                )}
              </button>
              {/* Approvals */}
              {settings.approvals?.enabled && (
                <button
                  type="button"
                  onClick={() => setShowApprovals(!showApprovals)}
                  title="Approvals"
                  aria-label="Approvals"
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${showApprovals ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-gray-900 text-[8px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
              {/* Drafts */}
              <button
                type="button"
                onClick={openDrafts}
                title="Saved drafts"
                aria-label="Saved drafts"
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {drafts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-accent text-brand-primary text-[8px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                    {drafts.length}
                  </span>
                )}
              </button>
              {/* Settings */}
              <button
                type="button"
                onClick={openSettings}
                title="Settings"
                aria-label="Settings"
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </nav>

            {/* User + sign out */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 mr-3 pl-3 border-l border-white/20">
                <span className="text-xs text-white/60 truncate max-w-[120px]">{profile.displayName}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                  title="Sign out"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            )}

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
                onClick={() => setShowBoard(!showBoard)}
                className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-label="Campaign board"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="10" rx="1" />
                  <rect x="14" y="17" width="7" height="4" rx="1" />
                </svg>
                {cards.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-brand-accent text-brand-primary text-[8px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
                    {cards.length}
                  </span>
                )}
              </button>
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
              <button
                type="button"
                onClick={handleSignOut}
                className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                aria-label="Sign out"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Coral accent line */}
        <div className="h-[2px] bg-brand-accent/50" aria-hidden="true" />
      </header>

      {/* ── Board view — replaces all form content when active ── */}
      {showBoard && (
        <KanbanBoard onClose={() => setShowBoard(false)} />
      )}

      {/* ── Hero band — compact on interior steps ── */}
      {!showBoard && (() => {
        const dynamicName = buildEmailName(watchedCampaignName, watchedRegions, watchedChannels, watchedDescription)
        const hasData = watchedCampaignName || watchedRegions.length > 0 || watchedChannels.length > 0
        return (
          <div className={`bg-brand-primary dark:bg-brand-primary-dark px-4 ${showTemplatePicker ? 'py-8' : 'py-5'}`}>
            <div className="max-w-7xl mx-auto flex items-end justify-between gap-6">
              <div className="min-w-0">
                <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1.5">Marketing Operations</p>
                <h1 className={`font-ni-display text-[#e8e5ce] leading-none tracking-tight ${showTemplatePicker ? 'text-4xl lg:text-5xl' : 'text-2xl lg:text-3xl'}`}>
                  {!showTemplatePicker && hasData ? (
                    <>
                      <span className="text-white/50">Email Briefing:</span>{' '}
                      <span className="truncate">{dynamicName}</span>
                    </>
                  ) : (
                    'Email Briefing'
                  )}
                </h1>
                {showTemplatePicker && (
                  <p className="text-[#e8e5ce]/60 text-sm mt-2">
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
                        <span className="text-white/50 text-2xl">{visibleBriefSteps.length}</span>
                      </p>
                      <p className="text-white/50 text-xs uppercase tracking-[0.18em] mt-1.5 font-ni-heading">{visibleBriefSteps[currentStep]?.label ?? ''}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1">Pipeline</p>
                      <p className="font-ni-display text-[#e8e5ce] text-xl leading-none">
                        {pipelineStep === 3 ? 'Brand Review' : 'HTML Email'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Step tabs (sticky below nav) ── */}
      {!showBoard && <div className="sticky top-14 z-30 bg-white dark:bg-gray-900 border-b border-brand-border-warm dark:border-gray-700 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6">
          <StepIndicator
            currentStep={indicatorStep}
            highestStepReached={highestStep}
            onStepClick={handlePipelineStepClick}
            briefSteps={visibleBriefSteps}
          />
        </div>
      </div>}

      {/* ── Main content ── */}
      {!showBoard && <div ref={cardRef} className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
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
                    {!isPipelineStep && currentBriefStepId === 'campaign' && <StepCampaign />}
                    {!isPipelineStep && currentBriefStepId === 'content' && <StepContent />}
                    {!isPipelineStep && currentBriefStepId === 'review' && (
                      <StepReview onSubmit={submitBrief} submitStatus={submitStatus} />
                    )}
                    {pipelineStep === 3 && (
                      <StepBrandReview
                        onAccept={handleBrandAccept}
                        onDecline={handleBrandDecline}
                        onGoToStep={handleGoToStep}
                      />
                    )}
                    {pipelineStep === 4 && (
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
                    stepId={currentStepId}
                    currentStepIndex={currentStep}
                    totalBriefSteps={visibleBriefSteps.length}
                    currentTheme={currentTheme}
                    onChangeTemplate={!isPipelineStep && currentBriefStepId === 'campaign' ? handleChangeTemplate : undefined}
                    campaignName={watchedCampaignName || undefined}
                    onOpenInsights={watchedCampaignName ? () => setShowInsights(true) : undefined}
                  />
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      </div>}

      {/* ── Sticky footer navigation — brief steps only ── */}
      {!showBoard && !isPipelineStep && !showTemplatePicker && (
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
                Back to {visibleBriefSteps[currentStep - 1]?.label ?? ''}
              </button>
            ) : (
              <div />
            )}
            <span className="text-xs text-brand-text-muted dark:text-gray-500 hidden sm:block">
              Step <strong className="text-gray-700 dark:text-gray-300">{currentStep + 1}</strong> of <strong className="text-gray-700 dark:text-gray-300">{visibleBriefSteps.length}</strong>
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
                onClick={() => handleNext(currentBriefStepId)}
                className="min-h-[44px] flex items-center gap-2 bg-brand-primary text-white px-7 py-3 text-xs font-ni-heading tracking-[0.15em] uppercase hover:bg-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                Continue to {visibleBriefSteps[currentStep + 1]?.label ?? ''}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Pipeline step 5 footer */}
      {!showBoard && pipelineStep === 5 && (
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
      <ApprovalsPanel
        isOpen={showApprovals}
        onClose={() => setShowApprovals(false)}
      />
      <CampaignInsightsSlideOver
        isOpen={showInsights}
        onClose={() => setShowInsights(false)}
        campaignName={watchedCampaignName}
      />
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
