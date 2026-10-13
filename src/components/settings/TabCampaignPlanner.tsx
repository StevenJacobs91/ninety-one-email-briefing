import { useSettings } from '../../contexts/SettingsContext'

export function TabCampaignPlanner() {
  const { settings, updateSettings } = useSettings()
  const cfg = settings.campaignPlanner

  function set<K extends keyof typeof cfg>(key: K, value: typeof cfg[K]) {
    updateSettings({ campaignPlanner: { ...cfg, [key]: value } })
  }

  function toggleColumn(col: 'briefed' | 'in-progress' | 'distributed') {
    const current = cfg.visibleColumns
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col]
    // Always keep at least one column
    if (next.length === 0) return
    set('visibleColumns', next)
  }

  const COLUMNS: { id: 'briefed' | 'in-progress' | 'distributed'; label: string }[] = [
    { id: 'briefed', label: 'Briefed' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'distributed', label: 'Distributed' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-ni-display text-brand-primary dark:text-brand-accent text-2xl leading-none mb-1.5">Campaign Planner</h2>
        <p className="text-sm text-brand-text-body dark:text-gray-400">
          Configure the Campaign Planner view and behaviour for your team.
        </p>
      </div>

      {/* Default view */}
      <section className="border border-brand-border-warm dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Default View</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Per-user preferences override this setting once a user has manually switched views.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['kanban', 'list', 'timeline', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set('defaultView', v)}
              className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                cfg.defaultView === v
                  ? 'border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-brand-primary/40 dark:hover:border-brand-accent/40'
              }`}
            >
              <span className={`text-xs font-medium capitalize ${cfg.defaultView === v ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-700 dark:text-gray-300'}`}>
                {v}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Column visibility */}
      <section className="border border-brand-border-warm dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Visible Columns (Kanban)</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose which workflow columns appear on the Kanban board.</p>
        <div className="space-y-2">
          {COLUMNS.map((col) => {
            const isOn = cfg.visibleColumns.includes(col.id)
            const isLast = cfg.visibleColumns.length === 1 && isOn
            return (
              <label key={col.id} className={`flex items-center gap-3 cursor-pointer ${isLast ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={isLast}
                  onChange={() => toggleColumn(col.id)}
                  className="w-4 h-4 accent-brand-primary"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{col.label}</span>
                {isLast && <span className="text-xs text-gray-400 dark:text-gray-500">(at least one required)</span>}
              </label>
            )
          })}
        </div>
      </section>

      {/* Card display */}
      <section className="border border-brand-border-warm dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Card Display</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Control which optional fields appear on campaign card tiles.</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Show Assignee</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Display the assigned team member on card tiles</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cfg.showAssignee}
              onClick={() => set('showAssignee', !cfg.showAssignee)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${cfg.showAssignee ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.showAssignee ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </label>
          <div className="h-px bg-gray-100 dark:bg-gray-800" />
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Show Progress Bars</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Display completion progress on card tiles</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cfg.showProgress}
              onClick={() => set('showProgress', !cfg.showProgress)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${cfg.showProgress ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.showProgress ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>
      </section>

      {/* Manual campaigns */}
      <section className="border border-brand-border-warm dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Allow Manual Campaigns</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
              When enabled, users can add campaigns directly from the planner without going through the email briefing form. Disable to restrict campaigns to brief submissions only.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.allowManualCampaigns}
            onClick={() => set('allowManualCampaigns', !cfg.allowManualCampaigns)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ml-4 shrink-0 ${cfg.allowManualCampaigns ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.allowManualCampaigns ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>
    </div>
  )
}
