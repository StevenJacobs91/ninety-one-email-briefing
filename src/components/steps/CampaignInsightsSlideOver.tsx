import { useEffect } from 'react'
import { useCampaignInsights } from '../../hooks/useCampaignInsights'
import { CampaignInsightsPanel } from './CampaignInsightsPanel'

interface CampaignInsightsSlideOverProps {
  isOpen: boolean
  onClose: () => void
  campaignName: string
}

export function CampaignInsightsSlideOver({ isOpen, onClose, campaignName }: CampaignInsightsSlideOverProps) {
  const campaignInsights = useCampaignInsights()

  // Auto-load when opened with a campaign name
  useEffect(() => {
    if (isOpen && campaignName && campaignInsights.status === 'idle') {
      campaignInsights.run(campaignName)
    }
  }, [isOpen, campaignName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when campaign name changes
  useEffect(() => {
    if (campaignInsights.status === 'success' || campaignInsights.status === 'error') {
      campaignInsights.reset()
    }
  }, [campaignName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-ni-display text-gray-900 dark:text-gray-100 truncate">Campaign Insights</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{campaignName}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 ml-4"
            title="Close insights"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {campaignInsights.status === 'idle' && (
            <div className="border border-teal-200 dark:border-teal-800/50 bg-teal-50 dark:bg-teal-950/20 rounded-lg p-6 text-center">
              <svg className="mx-auto w-10 h-10 text-teal-400 dark:text-teal-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300 mb-1">Campaign Insights</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Analyse engagement data for "{campaignName}" to inform your brief.
              </p>
              <button
                type="button"
                onClick={() => campaignInsights.run(campaignName)}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors"
              >
                Load Campaign Data
              </button>
            </div>
          )}

          {campaignInsights.status === 'loading' && (
            <div className="border border-teal-200 dark:border-teal-800/50 rounded-lg p-6 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">Loading campaign data...</p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Analysing the last 5 email sends for "{campaignName}".</p>
            </div>
          )}

          {campaignInsights.status === 'error' && (
            <div className="border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">Failed to Load Insights</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{campaignInsights.error}</p>
              <button
                type="button"
                onClick={() => campaignInsights.run(campaignName)}
                className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {campaignInsights.status === 'success' && campaignInsights.data && (
            <CampaignInsightsPanel data={campaignInsights.data} />
          )}
        </div>
      </div>
    </div>
  )
}
