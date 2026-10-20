import { useEffect, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import type { BriefPayload } from '../types/brief.types'
import { runBrandGuardianReview, type BrandReview } from '../lib/brandGuardian'
import { evaluateGate, type GateResult } from '../lib/brandReviewGate'
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
// Must be called inside the form's FormProvider.
export function useBrandReviewGate(): BrandReviewState {
  const { settings } = useSettings()
  const cfg = settings.brandGuardian
  const watched = useWatch() as unknown as BriefPayload
  const data = watched

  const review = useMemo(
    () => runBrandGuardianReview(data, { config: cfg, themes: settings.brandThemes, modules: settings.htmlModules }),
    [data, cfg, settings.brandThemes, settings.htmlModules],
  )

  const ai = useAIBrandGuardian(cfg)
  const aiMode = cfg.aiGuardian.mode

  useEffect(() => {
    if ((aiMode === 'pre-submission' || aiMode === 'post-submission') && ai.isAvailable && ai.status === 'idle') {
      ai.run(data)
    }
  }, [aiMode, ai.isAvailable]) // eslint-disable-line react-hooks/exhaustive-deps

  const gate = evaluateGate({
    score: review.score,
    minimumScore: cfg.minimumScore,
    aiMode,
    aiStatus: ai.status,
    aiRejected: ai.status === 'success' && ai.review?.status === 'rejected',
  })

  return { ...gate, data, review, ai, aiMode, minimumScore: cfg.minimumScore }
}
