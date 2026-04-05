import { useSettings } from '../../contexts/SettingsContext'
import type { CampaignInsightsConfig } from '../../types/settings.types'

export function TabCampaignInsights() {
  const { settings, updateSettings } = useSettings()
  const config: CampaignInsightsConfig = settings.campaignInsights ?? {
    enabled: true,
    tabs: { performance: true, prospects: true, timing: true },
    showTrendCards: true,
    showKeyInsights: true,
    showRecommendations: true,
  }

  function update(patch: Partial<CampaignInsightsConfig>) {
    updateSettings({ campaignInsights: { ...config, ...patch } })
  }

  function updateTab(tab: keyof CampaignInsightsConfig['tabs'], value: boolean) {
    update({ tabs: { ...config.tabs, [tab]: value } })
  }

  const disabled = !config.enabled

  return (
    <div className="space-y-6">
      {/* Master enable toggle */}
      <div className="flex items-start justify-between gap-4 p-4 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 rounded-lg">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Campaign Insights</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Shows a sidebar summary and slide-over panel on the Campaign step, displaying engagement metrics and recommendations from previous sends.
          </p>
        </div>
        <button
          type="button"
          onClick={() => update({ enabled: !config.enabled })}
          className={`w-10 h-[22px] rounded-full relative transition-colors shrink-0 mt-0.5 ${
            config.enabled ? 'bg-teal-600 dark:bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          title={config.enabled ? 'Disable Campaign Insights' : 'Enable Campaign Insights'}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            config.enabled ? 'left-[22px]' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* Tabs visibility */}
      <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Insight Tabs</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Choose which tabs appear in the expanded Campaign Insights panel.
        </p>
        <div className="space-y-1">
          {([
            { key: 'performance' as const, label: 'Performance', description: 'Recent sends table with CTR, delivered, and open rate' },
            { key: 'prospects' as const, label: 'Top Prospects', description: 'Engaged prospect list with scores, grades, and click counts' },
            { key: 'timing' as const, label: 'Timing & Patterns', description: 'Best send days and peak click hour heatmap' },
          ]).map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => updateTab(key, !config.tabs[key])}
                className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${
                  config.tabs[key] ? 'bg-teal-600 dark:bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={config.tabs[key] ? `Hide ${label} tab` : `Show ${label} tab`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  config.tabs[key] ? 'left-[17px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Panel sections */}
      <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Panel Sections</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Toggle individual sections that appear within the insights panel.
        </p>
        <div className="space-y-1">
          {([
            {
              key: 'showTrendCards' as const,
              label: 'Trend Cards',
              description: 'CTR, clicks, and list size trend indicators at the top of the panel',
            },
            {
              key: 'showKeyInsights' as const,
              label: 'Key Insights',
              description: 'Rules-based observations about subject lines, send patterns, and engagement',
            },
            {
              key: 'showRecommendations' as const,
              label: 'Recommendations',
              description: 'Actionable suggestions for improving campaign performance',
            },
          ]).map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => update({ [key]: !config[key] })}
                className={`w-8 h-[18px] rounded-full relative transition-colors shrink-0 ${
                  config[key] ? 'bg-teal-600 dark:bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={config[key] ? `Hide ${label}` : `Show ${label}`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${
                  config[key] ? 'left-[17px]' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Campaign Insights currently uses simulated data seeded from the campaign name. To enable live Pardot metrics, configure your API credentials in <strong className="font-medium text-gray-700 dark:text-gray-300">Settings → Pardot API</strong>.
        </p>
      </div>
    </div>
  )
}
