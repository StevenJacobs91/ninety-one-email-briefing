import { useEffect, useMemo } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import type { BriefFormData } from '../lib/schema'
import type { BriefPayload } from '../types/brief.types'
import { runBrandGuardianReview, type BrandReview } from '../lib/brandGuardian'
import { evaluateGate, shouldAutoRunAI, type GateResult } from '../lib/brandReviewGate'
import { useSettings } from '../contexts/SettingsContext'
import { useAIBrandGuardian } from './useAIBrandGuardian'

export interface BrandReviewState extends GateResult {
  data: BriefPayload
  review: BrandReview
  ai: ReturnType<typeof useAIBrandGuardian>
  aiMode: string
  minimumScore: number
}

// Static rules review, optional AI review, and the submit gate built from both.
export function useBrandReviewGate(control: Control<BriefFormData>, onReviewTab: boolean): BrandReviewState {
  const { settings } = useSettings()
  const cfg = settings.brandGuardian
  const watched = useWatch({ control }) as unknown as BriefPayload
  const data = watched

  const review = useMemo(
    () => runBrandGuardianReview(data, { config: cfg, themes: settings.brandThemes, modules: settings.htmlModules }),
    [data, cfg, settings.brandThemes, settings.htmlModules],
  )

  const ai = useAIBrandGuardian(cfg)
  const aiMode = cfg.aiGuardian.mode

  useEffect(() => {
    if (shouldAutoRunAI({ aiMode, aiAvailable: ai.isAvailable, aiStatus: ai.status, onReviewTab })) ai.run(data)
  }, [aiMode, ai.isAvailable, onReviewTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const gate = evaluateGate({
    score: review.score,
    minimumScore: cfg.minimumScore,
    aiMode,
    aiStatus: ai.status,
    aiRejected: ai.status === 'success' && ai.review?.status === 'rejected',
  })

  return { ...gate, data, review, ai, aiMode, minimumScore: cfg.minimumScore }
}
