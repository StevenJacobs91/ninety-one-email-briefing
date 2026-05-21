import { useSettings } from '../../contexts/SettingsContext'

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          onClick={() => onChange(!checked)}
          className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${
            checked ? 'bg-[#134848]' : 'bg-gray-200 dark:bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  )
}

export function TabAudienceHealth() {
  const { settings, updateSettings } = useSettings()
  const enabled = settings.audienceHealth?.enabled ?? false

  return (
    <div className="max-w-2xl space-y-8">
      {/* Master toggle */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
          <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
            Audience Health
          </h3>
        </div>

        <div className="bg-brand-bg-panel dark:bg-gray-800/40 border border-brand-border-warm dark:border-gray-700 rounded-lg p-5 space-y-5">
          <Toggle
            checked={enabled}
            onChange={(v) => updateSettings({ audienceHealth: { enabled: v } })}
            label="Enable Audience Health monitoring"
            description="When enabled, an Audience Health icon appears in the main navigation showing churn risk scores and engagement trends per segment."
          />
        </div>
      </section>

      {/* How it works */}
      {enabled ? (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
            <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
              How It Works
            </h3>
          </div>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Audience Health snapshots are computed by comparing recent engagement (CTR, delivery)
              against historical baselines across four segment types: <strong className="text-gray-700 dark:text-gray-300">Region</strong>,{' '}
              <strong className="text-gray-700 dark:text-gray-300">Channel</strong>,{' '}
              <strong className="text-gray-700 dark:text-gray-300">Client Group</strong>, and{' '}
              <strong className="text-gray-700 dark:text-gray-300">Email Type</strong>.
            </p>
            <p>
              Segments where recent CTR has dropped by 20%+ vs baseline are flagged as <strong className="text-amber-600 dark:text-amber-400">Medium</strong>,
              45%+ as <strong className="text-orange-600 dark:text-orange-400">High</strong>, and
              70%+ as <strong className="text-red-600 dark:text-red-400">Critical</strong>.
            </p>
            <p>
              Snapshots are recorded when briefs are moved to <strong className="text-gray-700 dark:text-gray-300">Distributed</strong> on the
              Kanban board, or can be refreshed manually from the Audience Health panel.
            </p>
          </div>

          <div className="mt-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Data requirement:</strong> At least 5 historical send events are needed before reliable churn scores can be computed.
              New teams will see empty state until data accumulates.
            </p>
          </div>
        </section>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enable Audience Health monitoring above to access the dashboard and configure churn detection.
          </p>
        </div>
      )}
    </div>
  )
}
