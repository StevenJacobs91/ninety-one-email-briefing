import { useSettings } from '../../contexts/SettingsContext'
import type { SendTimeOptimisationConfig } from '../../types/settings.types'

const DEFAULT_CONFIG: SendTimeOptimisationConfig = {
  enabled: false,
  minEventsRequired: 5,
}

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

export function TabSendTimeOptimisation() {
  const { settings, updateSettings } = useSettings()
  const config: SendTimeOptimisationConfig = settings.sendTimeOptimisation ?? DEFAULT_CONFIG

  function patch(updates: Partial<SendTimeOptimisationConfig>) {
    updateSettings({ sendTimeOptimisation: { ...config, ...updates } })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Master toggle */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
          <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
            Send Time Optimisation
          </h3>
        </div>

        <div className="bg-brand-bg-panel dark:bg-gray-800/40 border border-brand-border-warm dark:border-gray-700 rounded-lg p-5 space-y-5">
          <Toggle
            checked={config.enabled}
            onChange={(v) => patch({ enabled: v })}
            label="Enable send time optimisation"
            description="When enabled, the system analyses historical send performance and suggests optimal send windows directly in the brief form and kanban board."
          />

          {config.enabled && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />

              {/* Minimum events input */}
              <div>
                <label
                  htmlFor="sto-min-events"
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-1"
                >
                  Minimum events required for recommendation
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  The minimum number of historical send events needed before a recommendation is
                  shown. Recommendations with fewer data points are suppressed to avoid misleading
                  suggestions.
                </p>
                <input
                  id="sto-min-events"
                  type="number"
                  min={1}
                  max={50}
                  value={config.minEventsRequired}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10)
                    if (!isNaN(raw)) {
                      patch({ minEventsRequired: Math.min(50, Math.max(1, raw)) })
                    }
                  }}
                  className="w-28 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* How data is collected */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block w-6 h-px bg-brand-primary dark:bg-brand-accent" />
          <h3 className="text-xs tracking-[0.2em] uppercase font-ni-heading text-brand-primary dark:text-brand-accent">
            Data Collection
          </h3>
        </div>

        <div className="bg-brand-bg-panel dark:bg-gray-800/40 border border-brand-border-warm dark:border-gray-700 rounded-lg p-5 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Recommendation data is collected automatically when briefs are moved to{' '}
            <strong className="font-medium">'Distributed'</strong> on the Kanban board. Each event
            records the send day and hour alongside delivered count, unique clicks, and CTR.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The model uses Laplace smoothing to avoid over-fitting sparse day/hour cells. Windows
            are confidence-rated as <span className="font-medium text-green-600 dark:text-green-400">high</span> (&ge;10 sends),{' '}
            <span className="font-medium text-amber-500">medium</span> (&ge;3 sends), or{' '}
            <span className="font-medium text-gray-500">low</span> (&lt;3 sends) in the badge and
            suggestion banner.
          </p>
        </div>
      </section>

      {!config.enabled && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enable send time optimisation above to configure thresholds and start collecting
            engagement data.
          </p>
        </div>
      )}
    </div>
  )
}
