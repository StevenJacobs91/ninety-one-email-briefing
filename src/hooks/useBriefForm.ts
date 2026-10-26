import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { briefResolver } from '../lib/briefResolver'
import { defaultRequiredMap, type RequiredMap } from '../lib/briefRequirements'
import { v4 as uuidv4 } from 'uuid'
import type { BriefFormData } from '../lib/schema'
import { getStepFields } from '../lib/validateStep'
import { downloadBriefJson, copyBriefToClipboard } from '../lib/exportBrief'
import { saveBrief } from '../lib/supabaseQueries'
import type { BriefPayload } from '../types/brief.types'
import type { SenderType } from '../lib/constants'

const DEFAULT_TOTAL_STEPS = 2

interface BriefFormDefaults {
  senderType?: SenderType
  specificUser?: string
  fromName?: string
  fromAddress?: string
  replyToEmail?: string
  theme?: string
  urgency?: 'standard' | 'urgent'
  emailType?: string
  includeUnsubscribe?: boolean
}

function createDefaultValues(defaults?: BriefFormDefaults): BriefFormData {
  return {
    meta: {
      briefId: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    },
    campaign: {
      emailDescription: '',
      emailType: (defaults?.emailType ?? 'campaign') as BriefFormData['campaign']['emailType'],
      campaignName: '',
      theme: (defaults?.theme ?? 'leatherback-coral') as BriefFormData['campaign']['theme'],
      subjectLine: '',
      previewText: '',
      senderType: defaults?.senderType ?? 'general',
      specificUser: defaults?.specificUser ?? '',
      fromName: defaults?.fromName ?? 'Ninety One',
      fromAddress: defaults?.fromAddress ?? '',
      replyToEmail: defaults?.replyToEmail ?? '',
    },
    audience: {
      clientGroup: [],
      region: [],
      channel: [],
      pardotListId: '',
      distributionLists: [],
    },
    content: {
      headline: '',
      subHeadline: '',
      bodyIntro: '',
      sections: [],
      modules: [],
      moduleNotes: {},
      cta: {
        label: '',
        url: '',
        openInNewTab: true,
      },
      legalDisclaimer: '',
      includeUnsubscribe: defaults?.includeUnsubscribe ?? true,
    },
    htmlEdits: [],
    assets: {
      headerType: 'standard',
      logoVariant: 'horizontal',
      stripeColour: '',
      heroImageUrl: '',
      heroImageAlt: '',
      additionalAssetUrls: [],
      attachments: [],
    },
    deadlines: {
      contentApprovalDate: '',
      sendDate: '',
      urgency: defaults?.urgency ?? 'standard',
      oneOnOneRequired: false,
      notes: '',
      tags: '',
    },
  }
}

interface SupabaseContext {
  teamId?: string
  userId?: string
}

export function useBriefForm(
  defaults?: BriefFormDefaults,
  supabaseCtx?: SupabaseContext,
  totalBriefSteps = DEFAULT_TOTAL_STEPS,
  onSubmitSuccess?: (payload: BriefPayload) => void,
  /** The team's required/optional choices for the brief's fields, read when the form is checked */
  getRequired?: () => RequiredMap,
  /** The fields switched off in Settings, which the form does not ask for */
  getHidden?: () => ReadonlySet<string>,
) {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const form = useForm<BriefFormData>({
    resolver: briefResolver(() => getRequired?.() ?? defaultRequiredMap(), getHidden),
    defaultValues: createDefaultValues(defaults),
    mode: 'onTouched',
  })

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalBriefSteps) {
      setCurrentStep(step)
    }
  }, [totalBriefSteps])

  const handleNext = useCallback(async (stepId?: string) => {
    const fields = getStepFields(stepId ?? currentStep)
    const valid = await form.trigger(fields)
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, totalBriefSteps - 1))
    }
  }, [currentStep, form, totalBriefSteps])

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  /** Throws away everything entered and starts a blank brief (a new id, the sender defaults) at the first step. */
  const startNewBrief = useCallback(() => {
    form.reset(createDefaultValues(defaults))
    setCurrentStep(0)
    setSubmitStatus('idle')
  }, [form, defaults])

  const submitBrief = useCallback(async (mode: 'download' | 'clipboard') => {
    const valid = await form.trigger()
    if (!valid) return

    const data = form.getValues()
    const payload: BriefPayload = {
      ...data,
      meta: {
        ...data.meta,
        updatedAt: new Date().toISOString(),
        status: 'submitted',
      },
    }

    try {
      if (mode === 'download') {
        downloadBriefJson(payload)
      } else {
        await copyBriefToClipboard(payload)
      }

      // Persist to Supabase
      if (supabaseCtx?.teamId && supabaseCtx?.userId) {
        // Saved under its id (updated if already there), so exporting twice does not add a second copy.
        saveBrief(supabaseCtx.teamId, supabaseCtx.userId, payload).catch((err) =>
          console.error('Brief persistence failed:', err)
        )
      }

      form.setValue('meta.status', 'submitted')
      setSubmitStatus('success')
      onSubmitSuccess?.(payload)
    } catch {
      setSubmitStatus('error')
    }
  }, [form, supabaseCtx, onSubmitSuccess])

  return {
    form,
    currentStep,
    totalSteps: totalBriefSteps,
    goToStep,
    handleNext,
    handleBack,
    startNewBrief,
    submitBrief,
    submitStatus,
    setSubmitStatus,
  }
}
