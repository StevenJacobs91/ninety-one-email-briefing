import { useState, useCallback } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import {
  fetchCampaignInsights,
  type CampaignInsightsData,
} from '../lib/campaignInsights'

export type CampaignInsightsStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseCampaignInsightsReturn {
  status: CampaignInsightsStatus
  data: CampaignInsightsData | null
  error: string | null
  run: (campaignName: string) => Promise<void>
  reset: () => void
}

export function useCampaignInsights(): UseCampaignInsightsReturn {
  const { settings } = useSettings()
  const [status, setStatus] = useState<CampaignInsightsStatus>('idle')
  const [data, setData] = useState<CampaignInsightsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (campaignName: string) => {
    if (!campaignName.trim()) {
      setError('No campaign selected.')
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      const result = await fetchCampaignInsights(campaignName, settings.pardot)
      if (result.ok) {
        setData(result.data)
        setStatus('success')
      } else {
        setError(result.error)
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error fetching campaign insights.')
      setStatus('error')
    }
  }, [settings.pardot])

  const reset = useCallback(() => {
    setStatus('idle')
    setData(null)
    setError(null)
  }, [])

  return { status, data, error, run, reset }
}
