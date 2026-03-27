import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { v4 as uuidv4 } from 'uuid'
import { briefSchema, type BriefFormData } from '../lib/schema'
import { getStepFields } from '../lib/validateStep'
import { downloadBriefJson, copyBriefToClipboard } from '../lib/exportBrief'
import type { BriefPayload } from '../types/brief.types'

const TOTAL_STEPS = 5

interface BriefFormDefaults {
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
      emailType: (defaults?.emailType ?? 'campaign') as BriefFormData['campaign']['emailType'],
      campaignName: '',
      theme: (defaults?.theme ?? 'leatherback-coral') as BriefFormData['campaign']['theme'],
      subjectLine: '',
      previewText: '',
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
      sections: [
        {
          id: uuidv4(),
          heading: '',
          body: '',
          imageRequired: false,
          imageDescription: '',
        },
      ],
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

export function useBriefForm(defaults?: BriefFormDefaults) {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const form = useForm<BriefFormData>({
    resolver: zodResolver(briefSchema),
    defaultValues: createDefaultValues(defaults),
    mode: 'onTouched',
  })

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setCurrentStep(step)
    }
  }, [])

  const handleNext = useCallback(async () => {
    const fields = getStepFields(currentStep)
    const valid = await form.trigger(fields)
    if (valid) {
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    }
  }, [currentStep, form])

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

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
      form.setValue('meta.status', 'submitted')
      setSubmitStatus('success')
    } catch {
      setSubmitStatus('error')
    }
  }, [form])

  return {
    form,
    currentStep,
    totalSteps: TOTAL_STEPS,
    goToStep,
    handleNext,
    handleBack,
    submitBrief,
    submitStatus,
    setSubmitStatus,
  }
}
