import { useState, useEffect, useRef } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { useSettings } from '../../contexts/SettingsContext'
import type {
  DesignAssetTypeId,
  DesignBriefFormData,
  DesignBriefPayload,
  DesignBriefMeta,
  DesignAttachment,
  DesignMockup,
} from '../../types/design.types'
import { DESIGN_ASSET_TYPE_IDS } from '../../types/design.types'
import { ASSET_TYPE_META, DESIGN_ASSET_TYPES } from '../../lib/designConstants'
import { DesignForm } from './DesignForm'
import { MockupViewer } from './MockupViewer'

// ─── Export utilities ─────────────────────────────────────────

function downloadDesignBriefJson(payload: DesignBriefPayload): void {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = payload.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  a.download = `design-brief-${safeName}-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyDesignBriefToClipboard(payload: DesignBriefPayload): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
}

// ─── Draft persistence ────────────────────────────────────────

const DRAFT_KEY = 'ni-design-brief-draft'

function saveDraftToStorage(data: DesignBriefFormData): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function loadDraftFromStorage(): Partial<DesignBriefFormData> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<DesignBriefFormData>
  } catch {
    return null
  }
}

function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

// ─── Step types ───────────────────────────────────────────────

type DesignStep = 'asset-type' | 'brief' | 'review'

const STEPS: { id: DesignStep; label: string }[] = [
  { id: 'asset-type', label: 'Asset Type' },
  { id: 'brief', label: 'Brief' },
  { id: 'review', label: 'Review' },
]

function stepIndex(step: DesignStep): number {
  return STEPS.findIndex((s) => s.id === step)
}

// ─── Review summary helper ────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Component ───────────────────────────────────────────────

export function DesignBriefingPlatform({ onClose }: { onClose: () => void }) {
  const { profile, user } = useAuth()
  const { settings } = useSettings()

  const designSettings = settings.designBriefing

  const [step, setStep] = useState<DesignStep>('asset-type')
  const [selectedAssetType, setSelectedAssetType] = useState<DesignAssetTypeId | null>(null)
  const [attachments, setAttachments] = useState<DesignAttachment[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [mockups, setMockups] = useState<DesignMockup[]>([])
  const [showMockups, setShowMockups] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [copySuccess, setCopySuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const scrollRef = useRef<HTMLDivElement>(null)

  // Derive max attachments from settings (fall back to 10)
  const maxAttachments = designSettings?.maxAttachments ?? 10

  // Default form values from auth profile and settings
  const defaultRequesterName = designSettings?.defaultRequesterName || profile?.displayName || ''
  const defaultRequesterEmail = designSettings?.defaultRequesterEmail || user?.email || ''

  const form = useForm<DesignBriefFormData>({
    defaultValues: {
      assetType: DESIGN_ASSET_TYPE_IDS[0],
      projectName: '',
      requesterName: defaultRequesterName,
      requesterEmail: defaultRequesterEmail,
      dueDate: '',
      urgency: 'standard',
      colourTheme: '',
      briefNotes: '',
    },
  })

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraftFromStorage()
    if (draft) {
      form.reset({ ...form.getValues(), ...draft })
      if (draft.assetType) {
        setSelectedAssetType(draft.assetType)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced draft save on every change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        saveDraftToStorage(data as DesignBriefFormData)
      }, 500)
    })
    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form])

  // Escape key close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Validate common fields before advancing to review
  const validateBriefStep = (): boolean => {
    const vals = form.getValues()
    const errs: Record<string, string> = {}
    if (!vals.projectName?.trim()) errs.projectName = 'Project name is required'
    if (!vals.requesterName?.trim()) errs.requesterName = 'Requester name is required'
    if (!vals.requesterEmail?.trim()) {
      errs.requesterEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.requesterEmail)) {
      errs.requesterEmail = 'Enter a valid email address'
    }
    if (!vals.dueDate) errs.dueDate = 'Due date is required'
    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinueFromAssetType = () => {
    if (!selectedAssetType) return
    form.setValue('assetType', selectedAssetType)
    setStep('brief')
  }

  const handleContinueToBrief = () => {
    if (!validateBriefStep()) return
    setStep('review')
  }

  const handleBack = () => {
    if (step === 'brief') setStep('asset-type')
    else if (step === 'review') setStep('brief')
  }

  const buildPayload = (): DesignBriefPayload => {
    const vals = form.getValues()
    const now = new Date().toISOString()
    const meta: DesignBriefMeta = {
      briefId: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'submitted',
    }
    return {
      meta,
      ...vals,
      assetType: selectedAssetType ?? vals.assetType,
      attachments,
      imageUrls,
      mockups,
    }
  }

  const handleDownload = () => {
    try {
      const payload = buildPayload()
      downloadDesignBriefJson(payload)
      setSubmitStatus('success')
      clearDraftFromStorage()
    } catch {
      setSubmitStatus('error')
    }
  }

  const handleCopy = async () => {
    try {
      const payload = buildPayload()
      await copyDesignBriefToClipboard(payload)
      setCopySuccess(true)
      setSubmitStatus('success')
      clearDraftFromStorage()
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      setSubmitStatus('error')
    }
  }

  // Check if an asset type is enabled in settings
  const isAssetTypeEnabled = (id: DesignAssetTypeId): boolean => {
    if (!designSettings?.assetTypes) return true
    const cfg = designSettings.assetTypes.find((at) => at.id === id)
    return cfg ? cfg.enabled : true
  }

  const assetTypeMeta = selectedAssetType ? ASSET_TYPE_META[selectedAssetType] : null
  const assetTypeDef = selectedAssetType ? DESIGN_ASSET_TYPES.find((t) => t.id === selectedAssetType) : null

  const INPUT_CLASS = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40'
  const LABEL_CLASS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 tracking-[0.12em] uppercase mb-1.5'
  const ERROR_CLASS = 'text-xs text-red-600 dark:text-red-400 mt-1'

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg-warm dark:bg-[#1a1714] overflow-hidden flex flex-col">
      {/* ── Header bar ── */}
      <header className="shrink-0 bg-[#134848] dark:bg-[#0d3232]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: back + title + chip */}
          <div className="flex items-center gap-3 min-w-0">
            {step !== 'asset-type' && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go back"
                className="w-8 h-8 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-white/80 text-sm font-medium tracking-wide truncate">Design Brief</span>
              {assetTypeMeta && step !== 'asset-type' && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white/90"
                  style={{ backgroundColor: `${assetTypeMeta.color}40` }}
                >
                  <span aria-hidden="true">{assetTypeMeta.emoji}</span>
                  <span className="hidden sm:inline">{assetTypeMeta.label}</span>
                </span>
              )}
            </div>
          </div>

          {/* Centre: step indicator */}
          <div className="flex items-center gap-1.5 shrink-0" role="tablist" aria-label="Form progress">
            {STEPS.map((s, idx) => {
              const isActive = s.id === step
              const isComplete = stepIndex(step) > idx
              return (
                <div key={s.id} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <div className={`w-6 h-px ${isComplete ? 'bg-brand-accent' : 'bg-white/20'}`} aria-hidden="true" />
                  )}
                  <div
                    className={`
                      flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all
                      ${isActive ? 'bg-white/15 text-white' : isComplete ? 'text-brand-accent' : 'text-white/40'}
                    `}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Step ${idx + 1}: ${s.label}${isComplete ? ' (completed)' : ''}`}
                  >
                    {isComplete ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'}`}>
                        {idx + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: Close */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 border border-white/20 rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            Close
          </button>
        </div>
        {/* Accent line */}
        <div className="h-[2px] bg-brand-accent/50" aria-hidden="true" />
      </header>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {/* ═══════════════════════════════════════════════════
            STEP 1: Asset Type Selection
        ═══════════════════════════════════════════════════ */}
        {step === 'asset-type' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-8">
              <p className="text-xs tracking-[0.2em] uppercase font-medium text-brand-primary dark:text-brand-accent mb-2">Step 1 of 3</p>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">What are you briefing for?</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Select the type of design asset you need and we'll show you the relevant fields.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {DESIGN_ASSET_TYPE_IDS.filter(isAssetTypeEnabled).map((id) => {
                const meta = ASSET_TYPE_META[id]
                const isSelected = selectedAssetType === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedAssetType(id)}
                    aria-pressed={isSelected}
                    className={`
                      relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all
                      ${isSelected
                        ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-sm'
                      }
                    `}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-brand-primary dark:bg-brand-accent rounded-full flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    <span className="text-2xl" aria-hidden="true">{meta.emoji}</span>
                    <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-700 dark:text-gray-300'}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 leading-tight hidden sm:block">
                      {meta.description}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleContinueFromAssetType}
                disabled={!selectedAssetType}
                className="flex items-center gap-2 bg-[#134848] text-white px-6 py-2.5 text-sm font-medium rounded-lg hover:bg-[#0d3232] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
              >
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 2: Brief Form
        ═══════════════════════════════════════════════════ */}
        {step === 'brief' && selectedAssetType && (
          <FormProvider {...form}>
            <form onSubmit={(e) => e.preventDefault()} noValidate>
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <div className="mb-6">
                  <p className="text-xs tracking-[0.2em] uppercase font-medium text-brand-primary dark:text-brand-accent mb-2">Step 2 of 3</p>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Tell us about your brief</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Fill in the details below so we can produce the right asset for you.</p>
                </div>

                {/* ── Common fields card ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-5">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-wide">Project Details</h2>

                  {/* Project name */}
                  <div>
                    <label htmlFor="projectName" className={LABEL_CLASS}>
                      Project name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="projectName"
                      type="text"
                      placeholder="Give this brief a short, descriptive name"
                      {...form.register('projectName')}
                      className={INPUT_CLASS}
                    />
                    {validationErrors.projectName && <p className={ERROR_CLASS}>{validationErrors.projectName}</p>}
                  </div>

                  {/* Requester name + email side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="requesterName" className={LABEL_CLASS}>
                        Your name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="requesterName"
                        type="text"
                        {...form.register('requesterName')}
                        className={INPUT_CLASS}
                      />
                      {validationErrors.requesterName && <p className={ERROR_CLASS}>{validationErrors.requesterName}</p>}
                    </div>
                    <div>
                      <label htmlFor="requesterEmail" className={LABEL_CLASS}>
                        Your email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="requesterEmail"
                        type="email"
                        {...form.register('requesterEmail')}
                        className={INPUT_CLASS}
                      />
                      {validationErrors.requesterEmail && <p className={ERROR_CLASS}>{validationErrors.requesterEmail}</p>}
                    </div>
                  </div>

                  {/* Due date + urgency side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dueDate" className={LABEL_CLASS}>
                        Due date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="dueDate"
                        type="date"
                        {...form.register('dueDate')}
                        className={INPUT_CLASS}
                      />
                      {validationErrors.dueDate && <p className={ERROR_CLASS}>{validationErrors.dueDate}</p>}
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Urgency</label>
                      <div className="flex gap-2">
                        {(['standard', 'urgent'] as const).map((u) => {
                          const watched = form.watch('urgency')
                          const isActive = watched === u
                          return (
                            <button
                              key={u}
                              type="button"
                              onClick={() => form.setValue('urgency', u)}
                              aria-pressed={isActive}
                              className={`
                                flex-1 py-2 text-xs font-medium rounded-lg border transition-all
                                ${isActive
                                  ? u === 'urgent'
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-brand-primary text-white border-brand-primary'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                              `}
                            >
                              {u === 'urgent' ? 'Urgent' : 'Standard'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Divider with asset type name ── */}
                {assetTypeDef && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-lg" aria-hidden="true">{assetTypeDef.emoji}</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{assetTypeDef.label}</span>
                    </div>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}

                {/* ── Asset-specific fields card ── */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <DesignForm
                    assetTypeId={selectedAssetType}
                    fieldOverrides={
                      settings.designBriefing?.assetTypes
                        ?.find((at) => at.id === selectedAssetType)
                        ?.fields
                        ?.reduce<Record<string, { id: string; visible: boolean; order: number }>>((acc, f) => {
                          acc[f.id] = f
                          return acc
                        }, {})
                    }
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                    imageUrls={imageUrls}
                    onImageUrlsChange={setImageUrls}
                    maxAttachments={maxAttachments}
                  />
                </div>

                {/* ── Mockups section ── */}
                {(designSettings?.allowMockups !== false) && (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowMockups((v) => !v)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      aria-expanded={showMockups}
                      aria-controls="mockups-section"
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mockups</span>
                        {mockups.length > 0 && (
                          <span className="ml-2 text-xs text-brand-primary dark:text-brand-accent font-medium">
                            {mockups.length} added
                          </span>
                        )}
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        className={`text-gray-400 transition-transform ${showMockups ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {showMockups && (
                      <div id="mockups-section" className="px-6 pb-6">
                        <MockupViewer mockups={mockups} onChange={setMockups} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Footer navigation ── */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToBrief}
                    className="flex items-center gap-2 bg-[#134848] text-white px-6 py-2.5 text-sm font-medium rounded-lg hover:bg-[#0d3232] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                  >
                    Review Brief
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </FormProvider>
        )}

        {/* ═══════════════════════════════════════════════════
            STEP 3: Review
        ═══════════════════════════════════════════════════ */}
        {step === 'review' && selectedAssetType && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="mb-6">
              <p className="text-xs tracking-[0.2em] uppercase font-medium text-brand-primary dark:text-brand-accent mb-2">Step 3 of 3</p>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Review your brief</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Check everything looks correct, then download or copy your brief.</p>
            </div>

            {/* Summary card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Asset type banner */}
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{ backgroundColor: `${ASSET_TYPE_META[selectedAssetType].color}18` }}
              >
                <span className="text-2xl" aria-hidden="true">{ASSET_TYPE_META[selectedAssetType].emoji}</span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.12em] font-medium">Asset Type</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ASSET_TYPE_META[selectedAssetType].label}</p>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Project info */}
                <ReviewSection title="Project Details">
                  <ReviewRow label="Project Name" value={form.getValues('projectName')} />
                  <ReviewRow label="Requester" value={`${form.getValues('requesterName')} — ${form.getValues('requesterEmail')}`} />
                  <ReviewRow label="Due Date" value={form.getValues('dueDate') ? new Date(form.getValues('dueDate') + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
                  <ReviewRow label="Urgency" value={form.getValues('urgency') === 'urgent' ? 'Urgent' : 'Standard'} />
                  {form.getValues('colourTheme') && (
                    <ReviewRow label="Colour Theme" value={form.getValues('colourTheme') ?? ''} />
                  )}
                </ReviewSection>

                {/* Asset-specific fields */}
                {assetTypeDef && assetTypeDef.fields.length > 0 && (
                  <ReviewSection title={`${assetTypeDef.label} Details`}>
                    {assetTypeDef.fields
                      .filter((f) => f.type !== 'attachments' && f.type !== 'image-uploader' && f.type !== 'theme')
                      .map((f) => {
                        const val = form.getValues(f.id as keyof DesignBriefFormData)
                        if (!val || (Array.isArray(val) && val.length === 0)) return null
                        const displayVal = Array.isArray(val)
                          ? (val as string[]).join(', ')
                          : typeof val === 'boolean'
                            ? (val ? 'Yes' : 'No')
                            : String(val)
                        return <ReviewRow key={f.id} label={f.label} value={displayVal} />
                      })
                    }
                  </ReviewSection>
                )}

                {/* Attachments */}
                {attachments.length > 0 && (
                  <ReviewSection title={`Attachments (${attachments.length})`}>
                    <ul className="space-y-1.5">
                      {attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" aria-hidden="true" />
                          <span className="truncate font-medium">{a.name}</span>
                          {!a.isExternal && (
                            <span className="shrink-0 text-xs text-gray-400">{formatFileSize(a.size)}</span>
                          )}
                          {a.isExternal && (
                            <span className="shrink-0 text-xs text-gray-400">External URL</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ReviewSection>
                )}

                {/* Mockups */}
                {mockups.length > 0 && (
                  <ReviewSection title={`Mockups (${mockups.length})`}>
                    <div className="grid grid-cols-3 gap-2">
                      {mockups.map((m) => (
                        <div key={m.id} className="space-y-1">
                          <div className="aspect-[4/3] rounded overflow-hidden border border-gray-100 dark:border-gray-800">
                            <img src={m.url} alt={m.label} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </ReviewSection>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Export your brief</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#134848] text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-[#0d3232] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  {copySuccess ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-green-500" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
              {submitStatus === 'success' && (
                <p className="text-xs text-green-600 dark:text-green-400 text-center" role="status">
                  Brief exported successfully.
                </p>
              )}
              {submitStatus === 'error' && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center" role="alert">
                  Something went wrong. Please try again.
                </p>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex justify-start pb-6">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Brief
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-[0.12em]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null
  return (
    <div className="flex gap-4">
      <dt className="w-32 shrink-0 text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</dt>
      <dd className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">{value}</dd>
    </div>
  )
}
