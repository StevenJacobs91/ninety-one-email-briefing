import { useSettings } from '../../contexts/SettingsContext'
import { EMAIL_TYPES, EMAIL_TYPE_LABELS, SENDER_TYPES, SENDER_TYPE_LABELS, URGENCY_OPTIONS } from '../../lib/constants'
import type { EmailType, SenderType } from '../../lib/constants'
import { VISIBILITY_OPTIONS, isShown } from '../../lib/uiVisibility'
import { DEFAULT_SPAM_TERMS, SpamWordListEditor } from '../../features/subject-line-tester'
import { EmailEditorSetting } from './EmailEditorSetting'
import { ResetAllSettings } from './ResetAllSettings'
import { Switch } from '../ui/Switch'

export function TabGeneral() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const { senderDefaults, formDefaults } = settings
  const senderType: SenderType = senderDefaults.senderType ?? 'general'

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
            <label htmlFor="default-sender-type" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Default Sender</label>
            <select
              id="default-sender-type"
              value={senderType}
              onChange={(e) => updateSettings({ senderDefaults: { ...senderDefaults, senderType: e.target.value as SenderType } })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              {SENDER_TYPES.map((type) => (
                <option key={type} value={type}>{SENDER_TYPE_LABELS[type]}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Who new briefs are sent as in Pardot. A brief can choose another in its Sender Details.</p>
          </div>
          {senderType === 'general' && (
            <>
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
            </>
          )}
          {senderType === 'specific' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Specific User</label>
              <input
                type="text"
                value={senderDefaults.specificUser ?? ''}
                onChange={(e) => updateSettings({ senderDefaults: { ...senderDefaults, specificUser: e.target.value } })}
                placeholder="Pardot user ID, e.g. 12345"
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>
          )}
          {senderType === 'assigned' && (
            <p className="text-xs text-gray-500 dark:text-gray-400">Each recipient gets the email from their own assigned Pardot user, so there is no from name or address to set.</p>
          )}
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
            <Switch checked={formDefaults.includeUnsubscribe} label="Include Unsubscribe by default" onChange={(on) => updateSettings({ formDefaults: { ...formDefaults, includeUnsubscribe: on } })} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Show Tags section in Brief & Build</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tags are always collected — this controls visibility only</p>
            </div>
            <Switch checked={formDefaults.showTagsSection ?? true} label="Show Tags section in Brief & Build" onChange={(on) => updateSettings({ formDefaults: { ...formDefaults, showTagsSection: on } })} />
          </div>
        </div>
      </section>


      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Show / hide controls */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Show or hide</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Hide controls your team doesn&rsquo;t use. Hidden items are only removed from the screen.
        </p>
        {(['Campaign', 'Review and Submission'] as const).map((tab) => (
          <div key={tab} className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{tab} tab</p>
            <div className="space-y-3">
              {VISIBILITY_OPTIONS.filter((o) => o.tab === tab).map((o) => {
                const on = isShown(formDefaults, o.key)
                return (
                  <div key={o.key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{o.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{o.hint}</p>
                    </div>
                    <Switch checked={on} label={o.label} onChange={(next) => updateSettings({ formDefaults: { ...formDefaults, [o.key]: next } })} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>


      <hr className="border-gray-100 dark:border-gray-800" />

      {/* Spam word list: the words and phrases the Subject Line Tester flags */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Spam Word List</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Words and phrases the Subject Line Tester flags in a subject line. Matching is whole-word and ignores capitals. A match fails
          the &ldquo;No spam triggers&rdquo; check, which caps the score at 60%, and the tester never blocks sending.
        </p>
        <SpamWordListEditor
          value={settings.spamWordList ?? DEFAULT_SPAM_TERMS}
          onChange={(list) => updateSettings({ spamWordList: list })}
          customised={settings.spamWordList !== undefined}
          onRestoreDefaults={() => updateSettings({ spamWordList: undefined })}
        />
      </section>

      <hr className="border-gray-100 dark:border-gray-800" />

      {/* The application a submitted email's HTML is opened in from the Campaign Board */}
      <EmailEditorSetting />

      <hr className="border-gray-100 dark:border-gray-800" />

      <ResetAllSettings onReset={resetSettings} />
    </div>
  )
}
