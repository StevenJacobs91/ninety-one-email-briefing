import { useSettings } from '../../contexts/SettingsContext'

export function TabPardot() {
  const { settings, updateSettings } = useSettings()
  const cfg = settings.pardot

  const update = (patch: Partial<typeof cfg>) =>
    updateSettings({ pardot: { ...cfg, ...patch } })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Pardot / Account Engagement Integration
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure the connection to Salesforce Account Engagement (Pardot) for live list analysis.
          Until API credentials are set, the form uses realistic mock data.
        </p>
      </div>

      {/* Mock data toggle */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <div className="pt-0.5">
          <button
            type="button"
            role="switch"
            aria-checked={cfg.useMockData}
            onClick={() => update({ useMockData: !cfg.useMockData })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#134848] focus:ring-offset-1 ${
              cfg.useMockData ? 'bg-amber-400' : 'bg-[#134848]'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                cfg.useMockData ? 'translate-x-1' : 'translate-x-4.5'
              }`}
            />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Use mock data&nbsp;
            {cfg.useMockData && (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(currently active)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            When enabled, list analysis is generated from realistic demo data. Disable once API
            credentials are configured to use live Pardot data.
          </p>
        </div>
      </div>

      {/* API credentials */}
      <fieldset className={`space-y-4 ${cfg.useMockData ? 'opacity-50 pointer-events-none' : ''}`}>
        <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          API Credentials
        </legend>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Unit ID
          </label>
          <input
            type="text"
            value={cfg.businessUnitId}
            onChange={(e) => update({ businessUnitId: e.target.value })}
            placeholder="0Uv000000000000AAA"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848] font-mono"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Found in Salesforce Setup → Account Engagement → Business Units. 18-character ID starting with "0Uv".
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Proxy URL
          </label>
          <input
            type="url"
            value={cfg.apiProxyUrl}
            onChange={(e) => update({ apiProxyUrl: e.target.value })}
            placeholder="https://your-proxy.workers.dev/pardot"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            A server-side proxy is required because Pardot does not support browser CORS requests.
            Deploy a Cloudflare Worker, Vercel Edge Function, or n8n webhook that forwards to{' '}
            <code className="font-mono text-[11px]">https://pi.pardot.com/api/v5/objects/lists/&#123;id&#125;</code>.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pardot Instance URL
          </label>
          <input
            type="url"
            value={cfg.instanceUrl}
            onChange={(e) => update({ instanceUrl: e.target.value })}
            placeholder="https://pi.pardot.com"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Standard: <code className="font-mono text-[11px]">https://pi.pardot.com</code>&nbsp;&nbsp;
            EU tenants: <code className="font-mono text-[11px]">https://pi.eu.pardot.com</code>
          </p>
        </div>
      </fieldset>

      {/* Setup guide */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Integration Setup Guide</p>
        <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5 list-decimal list-inside">
          <li>Create a Salesforce Connected App with the Pardot API scope.</li>
          <li>Deploy a server-side proxy that handles OAuth 2.0 token refresh and forwards requests to the Pardot v5 REST API.</li>
          <li>Enter your Business Unit ID and proxy URL above.</li>
          <li>Disable "Use mock data" to activate live list lookups.</li>
        </ol>
      </div>
    </div>
  )
}
