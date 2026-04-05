import { useState, useCallback, useRef } from 'react'
import type { BriefPayload } from '../types/brief.types'
import type { BrandGuardianConfig } from '../types/settings.types'
import {
  runAIBrandGuardianReview,
  isAIGuardianConfigured,
  type AIBrandReview,
  type AIBrandGuardianError,
} from '../lib/aiBrandGuardian'

export interface UseAIBrandGuardianReturn {
  /** Whether the AI guardian is configured and available */
  isAvailable: boolean
  /** Current run state */
  status: 'idle' | 'running' | 'success' | 'error'
  /** The AI review result (only when status === 'success') */
  review: AIBrandReview | null
  /** Error details (only when status === 'error') */
  error: AIBrandGuardianError | null
  /** Trigger an AI review */
  run: (brief: BriefPayload) => Promise<void>
  /** Reset to idle state */
  reset: () => void
}

export function useAIBrandGuardian(guardianConfig: BrandGuardianConfig): UseAIBrandGuardianReturn {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [review, setReview] = useState<AIBrandReview | null>(null)
  const [error, setError] = useState<AIBrandGuardianError | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isAvailable = isAIGuardianConfigured(guardianConfig.aiGuardian)

  const run = useCallback(async (brief: BriefPayload) => {
    // Abort any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setStatus('running')
    setReview(null)
    setError(null)

    const result = await runAIBrandGuardianReview(brief, guardianConfig)

    // Check if aborted while waiting
    if (abortRef.current?.signal.aborted) return

    if (result.ok) {
      setReview(result.review)
      setStatus('success')
    } else {
      setError(result.error)
      setStatus('error')
    }
  }, [guardianConfig])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus('idle')
    setReview(null)
    setError(null)
  }, [])

  return { isAvailable, status, review, error, run, reset }
}
