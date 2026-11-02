import { useEffect, useMemo } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import type { BriefFormData } from '../lib/schema'
import type { BriefPayload } from '../types/brief.types'
import { runBrandGuardianReview, type BrandReview } from '../lib/brandGuardian'
import { evaluateGate, shouldAutoRunAI, type GateResult } from '../lib/brandReviewGate'
import { useSettings } from '../contexts/SettingsContext'
import { useAIBrandGuardian } from './useAIBrandGuardian'
import { useCatalogue } from '../components/builder2/useCatalogue'
import { deriveButtonLabels } from '../lib/moduleEngine/derive'
import type { ParseDoc } from '../lib/moduleEngine/regions'

const browserParse: ParseDoc = (html) => new DOMParser().parseFromString(html, 'text/html')

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

  // Every button in the email is checked for length, which needs the theme's module library to tell buttons from text.
  const cat = useCatalogue(data?.campaign?.theme ?? '')
  const catalogue = cat.status === 'ready' ? cat.catalogue : null
  const build = data?.content?.build
  const buttonLabels = useMemo(
    () => (build && catalogue ? deriveButtonLabels(build, catalogue, browserParse) : undefined),
    [build, catalogue],
  )

  const review = useMemo(
    () => runBrandGuardianReview(data, { config: cfg, themes: settings.brandThemes, modules: settings.htmlModules, buttonLabels }),
    [data, cfg, settings.brandThemes, settings.htmlModules, buttonLabels],
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
