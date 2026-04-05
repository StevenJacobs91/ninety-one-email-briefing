import { useState } from 'react'
import type {
  CampaignInsightsData,
  CampaignEmailRecord,
  EngagedProspect,
  CampaignTrend,
  SendTimePattern,
  ClickTimePattern,
} from '../../lib/campaignInsights'
import type { CampaignInsightsConfig } from '../../types/settings.types'

interface CampaignInsightsPanelProps {
  data: CampaignInsightsData
  config?: CampaignInsightsConfig
}

type InsightTab = 'overview' | 'prospects' | 'timing'

const DEFAULT_CONFIG: CampaignInsightsConfig = {
  enabled: true,
  tabs: { performance: true, prospects: true, timing: true },
  showTrendCards: true,
  showKeyInsights: true,
  showRecommendations: true,
}

export function CampaignInsightsPanel({ data, config: configProp }: CampaignInsightsPanelProps) {
  const config = configProp ?? DEFAULT_CONFIG

  const allTabs: Array<{ id: InsightTab; label: string; configKey: keyof CampaignInsightsConfig['tabs'] }> = [
    { id: 'overview', label: 'Performance', configKey: 'performance' },
    { id: 'prospects', label: 'Top Prospects', configKey: 'prospects' },
    { id: 'timing', label: 'Timing & Patterns', configKey: 'timing' },
  ]
  const tabs = allTabs.filter((t) => config.tabs[t.configKey] !== false)

  const firstVisibleTab = tabs[0]?.id ?? 'overview'
  const [tab, setTab] = useState<InsightTab>(firstVisibleTab)

  return (
    <div>
      {/* Mock data banner */}
      {data.isMock && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Showing simulated data. Connect the Pardot API in Settings → Pardot to see live campaign metrics.
          </p>
        </div>
      )}

      {/* Campaign header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data.campaignName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Last {data.emailCount} sends analysed
          </p>
        </div>
        <AggregateStats emails={data.emails} />
      </div>

      {/* Trends */}
      {config.showTrendCards !== false && data.trends.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {data.trends.map((trend) => (
            <TrendCard key={trend.metric} trend={trend} />
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-teal-600 dark:border-teal-400 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && config.tabs.performance !== false && (
        <OverviewTab
          emails={data.emails}
          insights={data.insights}
          recommendations={data.recommendations}
          openRateCaveat={data.openRateCaveat}
          showInsights={config.showKeyInsights !== false}
          showRecommendations={config.showRecommendations !== false}
        />
      )}
      {tab === 'prospects' && config.tabs.prospects !== false && (
        <ProspectsTab
          prospects={data.topProspects}
          recommendations={data.recommendations}
          showRecommendations={config.showRecommendations !== false}
        />
      )}
      {tab === 'timing' && config.tabs.timing !== false && (
        <TimingTab
          sendPatterns={data.sendTimePatterns}
          clickPatterns={data.clickTimePatterns}
          insights={data.insights}
          showInsights={config.showKeyInsights !== false}
        />
      )}
    </div>
  )
}

// ─── Aggregate Stats ────────────────────────────────────────────────────────

function AggregateStats({ emails }: { emails: CampaignEmailRecord[] }) {
  if (emails.length === 0) return null
  const avgCtr = emails.reduce((s, e) => s + e.uniqueCtr, 0) / emails.length
  const avgTotalCtr = emails.reduce((s, e) => s + e.totalCtr, 0) / emails.length
  const totalDelivered = emails.reduce((s, e) => s + e.delivered, 0)

  return (
    <div className="flex gap-3">
      <StatPill label="Avg Unique CTR" value={`${avgCtr.toFixed(1)}%`} />
      <StatPill label="Avg Total CTR" value={`${avgTotalCtr.toFixed(1)}%`} />
      <StatPill label="Total Delivered" value={totalDelivered.toLocaleString()} />
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  )
}

// ─── Trend Card ─────────────────────────────────────────────────────────────

function TrendCard({ trend }: { trend: CampaignTrend }) {
  const dirConfig = {
    up: {
      icon: '↑',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800/50',
    },
    down: {
      icon: '↓',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800/50',
    },
    stable: {
      icon: '→',
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      border: 'border-gray-200 dark:border-gray-700',
    },
  }
  const cfg = dirConfig[trend.direction]

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-sm font-bold ${cfg.color}`}>{cfg.icon}</span>
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">{trend.metric}</span>
      </div>
      {trend.changePercent !== null && (
        <p className={`text-lg font-bold ${cfg.color} leading-tight`}>
          {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
        </p>
      )}
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{trend.description}</p>
    </div>
  )
}

// ─── Overview Tab ───────────────────────────────────────────────────────────

function OverviewTab({
  emails,
  insights,
  recommendations,
  openRateCaveat,
  showInsights,
  showRecommendations,
}: {
  emails: CampaignEmailRecord[]
  insights: string[]
  recommendations: string[]
  openRateCaveat: string
  showInsights: boolean
  showRecommendations: boolean
}) {
  return (
    <div className="space-y-5">
      {/* Email performance table */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          Recent Sends
        </h4>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Subject Line</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Sent</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Delivered</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Opens*
                    <span className="text-[8px] text-amber-500" title="Unreliable metric">⚠</span>
                  </span>
                </th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Unique Clicks</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Unique CTR</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Total CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {emails.map((email) => (
                <EmailRow key={email.id} email={email} />
              ))}
            </tbody>
          </table>
        </div>
        {/* Open rate caveat */}
        <div className="flex items-start gap-2 mt-2 px-1">
          <span className="text-amber-500 text-xs mt-0.5">*</span>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
            {openRateCaveat}
          </p>
        </div>
      </div>

      {/* Insights */}
      {showInsights && insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            Key Insights
          </h4>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmailRow({ email }: { email: CampaignEmailRecord }) {
  const sentDate = new Date(email.sentAt)
  const dateStr = sentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })

  // Colour-code CTR
  const ctrColor = email.uniqueCtr >= 6
    ? 'text-green-600 dark:text-green-400 font-semibold'
    : email.uniqueCtr >= 4
      ? 'text-gray-800 dark:text-gray-200'
      : 'text-red-600 dark:text-red-400'

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 max-w-[220px]">
        <p className="truncate" title={email.subjectLine}>{email.subjectLine}</p>
      </td>
      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{dateStr}</td>
      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{email.delivered.toLocaleString()}</td>
      <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500 whitespace-nowrap">
        <span title="Open rates are unreliable — see caveat below">
          {email.uniqueOpenRate}%
        </span>
      </td>
      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">{email.uniqueClicks.toLocaleString()}</td>
      <td className={`px-3 py-2 text-right whitespace-nowrap ${ctrColor}`}>{email.uniqueCtr}%</td>
      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400 whitespace-nowrap">{email.totalCtr}%</td>
    </tr>
  )
}

// ─── Prospects Tab ──────────────────────────────────────────────────────────

function ProspectsTab({
  prospects,
  recommendations,
  showRecommendations,
}: {
  prospects: EngagedProspect[]
  recommendations: string[]
  showRecommendations: boolean
}) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-gray-400 dark:text-gray-500">No prospect engagement data available.</p>
      </div>
    )
  }

  // Find recommendations relevant to prospects
  const prospectRecs = recommendations.filter(
    (r) => r.toLowerCase().includes('prospect') || r.toLowerCase().includes('cohort') || r.toLowerCase().includes('follow-up')
  )

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          Top Engaged Prospects
        </h4>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
          Ranked by engagement score across all sends in this campaign.
        </p>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Prospect</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Grade</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Score</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Opens</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Clicks</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {prospects.map((prospect, i) => (
                <ProspectRow key={prospect.id} prospect={prospect} rank={i + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engagement distribution */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          Engagement Distribution
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <EngagementBucket
            label="High Intent"
            description="3+ clicks"
            count={prospects.filter((p) => p.clicksInCampaign >= 3).length}
            total={prospects.length}
            color="green"
          />
          <EngagementBucket
            label="Moderate"
            description="1-2 clicks"
            count={prospects.filter((p) => p.clicksInCampaign >= 1 && p.clicksInCampaign < 3).length}
            total={prospects.length}
            color="amber"
          />
          <EngagementBucket
            label="Opens Only"
            description="0 clicks"
            count={prospects.filter((p) => p.clicksInCampaign === 0 && p.opensInCampaign > 0).length}
            total={prospects.length}
            color="gray"
          />
        </div>
      </div>

      {/* Prospect-specific recommendations */}
      {showRecommendations && prospectRecs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            Prospect Recommendations
          </h4>
          <div className="space-y-2">
            {prospectRecs.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProspectRow({ prospect, rank }: { prospect: EngagedProspect; rank: number }) {
  const lastActive = new Date(prospect.lastActivityAt)
  const daysAgo = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

  const gradeColors: Record<string, string> = {
    'A+': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'A': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'A-': 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    'B+': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'B': 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'B-': 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
    'C+': 'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-500',
    'C': 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="px-3 py-2 text-gray-400 dark:text-gray-500 font-mono">{rank}</td>
      <td className="px-3 py-2">
        <p className="text-gray-800 dark:text-gray-200 font-medium">{prospect.name ?? 'Unknown'}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">{prospect.email}</p>
      </td>
      <td className="px-3 py-2 text-center">
        {prospect.grade && (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${gradeColors[prospect.grade] ?? 'bg-gray-100 text-gray-500'}`}>
            {prospect.grade}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{prospect.score}</td>
      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{prospect.opensInCampaign}</td>
      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">{prospect.clicksInCampaign}</td>
      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
      </td>
    </tr>
  )
}

function EngagementBucket({
  label,
  description,
  count,
  total,
  color,
}: {
  label: string
  description: string
  count: number
  total: number
  color: 'green' | 'amber' | 'gray'
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colors = {
    green: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50',
    amber: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50',
    gray: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
  }
  const textColors = {
    green: 'text-green-700 dark:text-green-400',
    amber: 'text-amber-700 dark:text-amber-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }

  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className={`text-lg font-bold ${textColors[color]}`}>{count}</p>
      <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">{description} · {pct}%</p>
    </div>
  )
}

// ─── Timing Tab ─────────────────────────────────────────────────────────────

function TimingTab({
  sendPatterns,
  clickPatterns,
  insights,
  showInsights,
}: {
  sendPatterns: SendTimePattern[]
  clickPatterns: ClickTimePattern[]
  insights: string[]
  showInsights: boolean
}) {
  // Filter timing-relevant insights
  const timingInsights = insights.filter(
    (i) => i.toLowerCase().includes('send') || i.toLowerCase().includes('peak') || i.toLowerCase().includes('engagement window')
  )

  return (
    <div className="space-y-5">
      {/* Send day patterns */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          Send Day Performance
        </h4>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
          Average unique click-through rate by day of week.
        </p>
        {sendPatterns.length > 0 ? (
          <div className="space-y-2">
            {sendPatterns.map((pattern) => {
              const maxCtr = Math.max(...sendPatterns.map((p) => p.avgUniqueCtr))
              const barWidth = maxCtr > 0 ? (pattern.avgUniqueCtr / maxCtr) * 100 : 0
              const isTop = pattern.avgUniqueCtr === maxCtr

              return (
                <div key={pattern.dayOfWeek} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-24 shrink-0 font-medium">
                    {pattern.dayLabel}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
                    <div
                      className={`h-full rounded-md transition-all ${
                        isTop
                          ? 'bg-teal-500 dark:bg-teal-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className={`absolute inset-y-0 flex items-center text-[10px] font-semibold ${
                      barWidth > 30 ? 'left-2 text-white' : 'right-2 text-gray-600 dark:text-gray-400'
                    }`}>
                      {pattern.avgUniqueCtr}% CTR
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 w-16 text-right">
                    {pattern.sendCount} send{pattern.sendCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No send pattern data available.</p>
        )}
      </div>

      {/* Click hour heatmap */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          Peak Click Hours
        </h4>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
          Distribution of clicks across time of day (top hours shown).
        </p>
        {clickPatterns.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {clickPatterns.slice(0, 8).map((pattern, i) => {
              const maxShare = Math.max(...clickPatterns.map((p) => p.clickShare))
              const intensity = maxShare > 0 ? pattern.clickShare / maxShare : 0

              return (
                <div
                  key={pattern.hour}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 text-center"
                  style={{
                    backgroundColor: `rgba(13, 148, 136, ${0.05 + intensity * 0.2})`,
                  }}
                >
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{pattern.hourLabel}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{pattern.clickShare}% of clicks</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{pattern.totalClicks.toLocaleString()} clicks</p>
                  {i === 0 && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 uppercase">
                      Peak
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">No click pattern data available.</p>
        )}
      </div>

      {/* Timing insights */}
      {showInsights && timingInsights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            Timing Insights
          </h4>
          <div className="space-y-2">
            {timingInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-md bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
                <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
