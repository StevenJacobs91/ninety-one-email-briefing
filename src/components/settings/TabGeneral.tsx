import { useSettings } from '../../contexts/SettingsContext'
import { EMAIL_TYPES, EMAIL_TYPE_LABELS, URGENCY_OPTIONS } from '../../lib/constants'
import type { EmailType } from '../../lib/constants'

export function TabGeneral() {
  const { settings, updateSettings } = useSettings()
  const { senderDefaults, formDefaults, n8nWebhookUrl } = settings

  return (
    <div className="space-y-8">

      {/* Sender Defaults */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Sender Defaults</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Pre-fill sender fields on every new brief. Individual briefs can override these.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Name</label>
            <input
              type="text"
              value={senderDefaults.fromName}
              onChange={(e) => updateSettings({ senderDefaults: { ...senderDefaults, fromName: e.target.value } })}
              placeholder="Ninety One"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Address</label>
            <input
              type="email"
              value={senderDefaults.fromAddress}
              onChange={(e) => updateSettings({ senderDefaults: { ...senderDefaults, fromAddress: e.target.value } })}
              placeholder="noreply@ninetyone.com"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reply-To Email</label>
            <input
              type="email"
              value={senderDefaults.replyToEmail}
              onChange={(e) => updateSettings({ senderDefaults: { ...senderDefaults, replyToEmail: e.target.value } })}
              placeholder="Optional"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Form Defaults */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Form Defaults</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Default selections applied to every new brief.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Default Email Type</label>
            <select
              value={formDefaults.emailType}
              onChange={(e) => updateSettings({ formDefaults: { ...formDefaults, emailType: e.target.value } })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              {EMAIL_TYPES.map((t) => (
                <option key={t} value={t}>{EMAIL_TYPE_LABELS[t as EmailType]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Default Brand Theme</label>
            <select
              value={formDefaults.theme}
              onChange={(e) => updateSettings({ formDefaults: { ...formDefaults, theme: e.target.value } })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              {(settings.brandThemes ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Default Urgency</label>
            <div className="flex gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateSettings({ formDefaults: { ...formDefaults, urgency: opt } })}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                    formDefaults.urgency === opt
                      ? opt === 'urgent'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Include Unsubscribe by default</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Required for marketing sends</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ formDefaults: { ...formDefaults, includeUnsubscribe: !formDefaults.includeUnsubscribe } })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                formDefaults.includeUnsubscribe ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={formDefaults.includeUnsubscribe}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                formDefaults.includeUnsubscribe ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Tags section in Campaign tab</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tags are always collected — this controls visibility only</p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ formDefaults: { ...formDefaults, showTagsSection: !(formDefaults.showTagsSection ?? true) } })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                (formDefaults.showTagsSection ?? true) ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={formDefaults.showTagsSection ?? true}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                (formDefaults.showTagsSection ?? true) ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* n8n Integration */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">n8n Integration</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          When configured, the "Submit Brief & Template" button will POST the brief JSON and HTML directly to your n8n webhook instead of opening the email client.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook URL</label>
          <input
            type="url"
            value={n8nWebhookUrl}
            onChange={(e) => updateSettings({ n8nWebhookUrl: e.target.value })}
            placeholder="https://your-n8n-instance.com/webhook/..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary font-mono"
          />
          {n8nWebhookUrl && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1.5">
              ✓ Webhook configured — submission will POST to n8n
            </p>
          )}
        </div>
      </section>

    </div>
  )
}
