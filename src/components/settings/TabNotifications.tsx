import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import {
  NOTIFICATION_EVENT_META,
  NOTIFICATION_GROUP_META,
  type NotificationsSettings,
  type NotificationEventConfig,
  type NotificationEventType,
  type NotificationEventGroup,
} from '../../types/notifications.types'
import { testNotification } from '../../lib/notificationService'

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#134848]/30 dark:focus:ring-[#134848]/40'

const GROUP_ORDER: NotificationEventGroup[] = ['brief', 'board', 'approval', 'system']

// ─── Types ────────────────────────────────────────────────────────────────────

type TestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; code?: number }
  | { status: 'error'; message: string }

// ─── Helper ───────────────────────────────────────────────────────────────────

function patchEvent(
  eventType: NotificationEventType,
  patch: Partial<NotificationEventConfig>,
  settings: NotificationsSettings,
  updateSettings: (p: Partial<{ notifications: NotificationsSettings }>) => void
) {
  updateSettings({
    notifications: {
      ...settings,
      events: settings.events.map((e) =>
        e.eventType === eventType ? { ...e, ...patch } : e
      ),
    },
  })
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

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

// ─── GlobalTestButton ─────────────────────────────────────────────────────────

function GlobalTestButton({
  settings,
  disabled,
}: {
  settings: NotificationsSettings
  disabled: boolean
}) {
  const [state, setState] = useState<TestState>({ status: 'idle' })

  async function handleTest() {
    setState({ status: 'loading' })
    try {
      const result = await testNotification('brief_submitted', settings)
      if (result.success) {
        setState({ status: 'success', code: result.statusCode })
      } else {
        setState({ status: 'error', message: result.error ?? 'Unknown error' })
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      })
    }
    setTimeout(() => setState({ status: 'idle' }), 5000)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleTest}
        disabled={disabled || state.status === 'loading'}
        className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {state.status === 'loading' ? (
          <>
            <svg
              className="animate-spin w-3.5 h-3.5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Sending…
          </>
        ) : (
          'Test Global Webhook'
        )}
      </button>
      {state.status === 'success' && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
          ✓ Delivered{state.code ? ` (${state.code})` : ''}
        </span>
      )}
      {state.status === 'error' && (
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
          ✗ Failed — {state.message}
        </span>
      )}
    </div>
  )
}

// ─── EventTestButton ──────────────────────────────────────────────────────────

function EventTestButton({
  eventType,
  settings,
}: {
  eventType: NotificationEventType
  settings: NotificationsSettings
}) {
  const [state, setState] = useState<TestState>({ status: 'idle' })

  async function handleTest() {
    setState({ status: 'loading' })
    try {
      const result = await testNotification(eventType, settings)
      if (result.success) {
        setState({ status: 'success', code: result.statusCode })
      } else {
        setState({ status: 'error', message: result.error ?? 'Unknown error' })
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      })
    }
    setTimeout(() => setState({ status: 'idle' }), 5000)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={handleTest}
        disabled={state.status === 'loading'}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {state.status === 'loading' ? (
          <>
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Testing…
          </>
        ) : (
          'Test'
        )}
      </button>
      {state.status === 'success' && (
        <span className="text-[11px] text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
          ✓ {state.code ?? 'OK'}
        </span>
      )}
      {state.status === 'error' && (
        <span
          className="text-[11px] text-red-600 dark:text-red-400 font-medium max-w-[160px] truncate"
          title={state.message}
        >
          ✗ {state.message}
        </span>
      )}
    </div>
  )
}

// ─── MergeTagChip ─────────────────────────────────────────────────────────────

function MergeTagChip({ tag }: { tag: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(tag).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className="inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-[#134848]/10 dark:hover:bg-[#134848]/30 hover:text-[#134848] dark:hover:text-[#6ab8b8] transition-colors cursor-pointer"
    >
      {copied ? '✓ copied' : tag}
    </button>
  )
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({
  eventConfig,
  notifSettings,
  updateSettings,
}: {
  eventConfig: NotificationEventConfig
  notifSettings: NotificationsSettings
  updateSettings: (p: Partial<{ notifications: NotificationsSettings }>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = NOTIFICATION_EVENT_META[eventConfig.eventType]

  function patch(updates: Partial<NotificationEventConfig>) {
    patchEvent(eventConfig.eventType, updates, notifSettings, updateSettings)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Collapsed header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800/40 hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors">
        {/* Toggle */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <div
            onClick={() => patch({ enabled: !eventConfig.enabled })}
            className={`relative w-8 h-5 rounded-full transition-colors cursor-pointer ${
              eventConfig.enabled ? 'bg-[#134848]' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                eventConfig.enabled ? 'translate-x-3' : 'translate-x-0.5'
              }`}
            />
          </div>
        </div>

        {/* Label + description — clickable to expand */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-baseline gap-3 text-left min-w-0"
        >
          <span
            className={`text-sm font-medium shrink-0 ${
              eventConfig.enabled
                ? 'text-gray-800 dark:text-gray-200'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {meta.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:block">
            {meta.description}
          </span>
        </button>

        {/* Test button */}
        <div onClick={(e) => e.stopPropagation()}>
          <EventTestButton
            eventType={eventConfig.eventType}
            settings={notifSettings}
          />
        </div>

        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/20 space-y-4">
          {/* Custom webhook URL */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Custom Webhook URL
            </label>
            <input
              type="url"
              value={eventConfig.webhookUrl}
              onChange={(e) => patch({ webhookUrl: e.target.value })}
              placeholder="Leave empty to use global URL"
              className={INPUT_CLASS}
            />
          </div>

          {/* Subject template */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Subject Template
            </label>
            <input
              type="text"
              value={eventConfig.subjectTemplate}
              onChange={(e) => patch({ subjectTemplate: e.target.value })}
              placeholder={meta.defaultSubject}
              className={INPUT_CLASS}
            />
            {meta.mergeTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 mr-0.5">
                  Available tags:
                </span>
                {meta.mergeTags.map((tag) => (
                  <MergeTagChip key={tag} tag={tag} />
                ))}
              </div>
            )}
          </div>

          {/* Recipient options */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recipients
            </p>
            <Toggle
              checked={eventConfig.sendToRequester}
              onChange={(v) => patch({ sendToRequester: v })}
              label="Send to requester"
              description="Include the requester's email address in the payload"
            />
            <Toggle
              checked={eventConfig.sendToTeam}
              onChange={(v) => patch({ sendToTeam: v })}
              label="Send to team / producer"
              description="Include the team email in the payload"
            />
          </div>

          {/* Additional recipients */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Additional Recipients
            </label>
            <input
              type="text"
              value={eventConfig.additionalRecipients}
              onChange={(e) => patch({ additionalRecipients: e.target.value })}
              placeholder="comma@example.com, another@example.com"
              className={INPUT_CLASS}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Comma-separated. These are passed in the payload for Power Automate to use.
            </p>
          </div>

          {/* Include full payload */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={eventConfig.includeFullPayload}
              onChange={(e) => patch({ includeFullPayload: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#134848] focus:ring-[#134848]/30 accent-[#134848]"
            />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Include full brief payload
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Attach the complete brief JSON to the webhook payload
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}

// ─── SetupGuide ───────────────────────────────────────────────────────────────

function SetupGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-blue-200 dark:border-blue-800/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500 dark:text-blue-400 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            How to set up your Power Automate flow
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-blue-500 dark:text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 py-4 bg-white dark:bg-gray-800/40 space-y-4">
          <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span>
                Open{' '}
                <a
                  href="https://make.powerautomate.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#134848] dark:text-[#6ab8b8] underline hover:no-underline"
                >
                  make.powerautomate.com
                </a>{' '}
                and sign in with your Microsoft account.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span>
                Create a new flow and choose <strong>Instant cloud flow</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <span>
                Add a trigger and search for{' '}
                <strong>"When an HTTP request is received"</strong>. No JSON schema needed — the flow
                will accept any payload.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                4
              </span>
              <span>
                Add an action: <strong>"Send an email (V2)"</strong> from the Office 365 Outlook
                connector.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                5
              </span>
              <span>
                Use dynamic content from the HTTP trigger body in your <strong>To</strong>,{' '}
                <strong>Subject</strong>, and <strong>Body</strong> fields.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                6
              </span>
              <span>
                Save the flow, then copy the <strong>"HTTP POST URL"</strong> shown on the trigger
                card.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center">
                7
              </span>
              <span>
                Paste that URL in the <strong>Global Webhook URL</strong> field above, or override it
                per-event below.
              </span>
            </li>
          </ol>

          {/* Payload reference */}
          <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Available payload fields
              </p>
            </div>
            <div className="px-3 py-3 bg-white dark:bg-gray-800/30 flex flex-wrap gap-1.5">
              {[
                'event',
                'eventLabel',
                'subject',
                'timestamp',
                'isTest',
                'campaignName',
                'emailName',
                'emailType',
                'sendDate',
                'contentApprovalDate',
                'regions',
                'channels',
                'urgency',
                'requesterName',
                'requesterEmail',
                'fromColumn',
                'toColumn',
                'movedBy',
                'approverRole',
                'approvedBy',
                'rejectedBy',
                'reason',
                'dueDate',
                'displayName',
                'role',
                'invitedBy',
                'briefId',
                'recipients.sendToRequester',
                'recipients.sendToTeam',
                'recipients.additional',
              ].map((field) => (
                <code
                  key={field}
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TabNotifications ─────────────────────────────────────────────────────────

export function TabNotifications() {
  const { settings, updateSettings } = useSettings()
  const notif = settings.notifications

  function patchNotif(updates: Partial<NotificationsSettings>) {
    updateSettings({ notifications: { ...notif, ...updates } })
  }

  // Group event configs by their group
  const eventsByGroup = GROUP_ORDER.reduce<
    Record<NotificationEventGroup, NotificationEventConfig[]>
  >(
    (acc, group) => {
      acc[group] = notif.events.filter(
        (e) => NOTIFICATION_EVENT_META[e.eventType].group === group
      )
      return acc
    },
    { brief: [], board: [], approval: [], system: [] }
  )

  const hasGlobalUrl = notif.globalWebhookUrl.trim().length > 0

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Section header ── */}
      <div className="flex items-center gap-3">
        <span className="inline-block w-6 h-px bg-[#134848] dark:bg-[#6ab8b8]" />
        <h3 className="text-xs tracking-[0.2em] uppercase font-medium text-[#134848] dark:text-[#6ab8b8]">
          Power Automate Notifications
        </h3>
      </div>

      {/* ── Section 1: Global Settings ── */}
      <section>
        <div className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-5">
          {/* Master toggle */}
          <Toggle
            checked={notif.enabled}
            onChange={(v) => patchNotif({ enabled: v })}
            label="Enable Power Automate Notifications"
            description="When enabled, configured events will POST a JSON payload to your Power Automate HTTP trigger URL."
          />

          {notif.enabled && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-700" />

              {/* Global webhook URL */}
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Global Webhook URL
                </label>
                <input
                  type="url"
                  value={notif.globalWebhookUrl}
                  onChange={(e) => patchNotif({ globalWebhookUrl: e.target.value })}
                  placeholder="https://prod-xx.westeurope.logic.azure.com/workflows/…"
                  className={INPUT_CLASS}
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Paste the HTTP POST URL from your Power Automate flow. All events without a custom
                  URL will use this.
                </p>
              </div>

              {/* Test global webhook */}
              <GlobalTestButton settings={notif} disabled={!hasGlobalUrl} />

              <div className="h-px bg-gray-100 dark:bg-gray-700" />

              {/* Delivery settings */}
              <div className="space-y-4">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Delivery Settings
                </p>

                <Toggle
                  checked={notif.retryOnFailure}
                  onChange={(v) => patchNotif({ retryOnFailure: v })}
                  label="Retry on failure"
                  description="Automatically retry failed webhook calls with exponential backoff."
                />

                {notif.retryOnFailure && (
                  <div className="ml-14">
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                      Max retries
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={notif.maxRetries}
                      onChange={(e) =>
                        patchNotif({
                          maxRetries: Math.min(5, Math.max(1, Number(e.target.value))),
                        })
                      }
                      className={`${INPUT_CLASS} w-24`}
                    />
                  </div>
                )}

                <Toggle
                  checked={notif.logDelivery}
                  onChange={(v) => patchNotif({ logDelivery: v })}
                  label="Log delivery outcomes to audit trail"
                  description="Record webhook delivery results (success, failure, status code) in the audit log."
                />

                {/* Deadline warning window */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Deadline warning window (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={notif.deadlineWarningHours}
                    onChange={(e) =>
                      patchNotif({
                        deadlineWarningHours: Math.min(
                          168,
                          Math.max(1, Number(e.target.value))
                        ),
                      })
                    }
                    className={`${INPUT_CLASS} w-28`}
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    How many hours before a send date to fire the{' '}
                    <code className="font-mono text-[10px]">deadline_approaching</code> event.
                    Minimum 1, maximum 168 (7 days).
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Section 2: Setup Guide ── */}
      {notif.enabled && (
        <section>
          <SetupGuide />
        </section>
      )}

      {/* ── Section 3: Event Groups ── */}
      {notif.enabled && (
        <section className="space-y-8">
          {GROUP_ORDER.map((group) => {
            const groupMeta = NOTIFICATION_GROUP_META[group]
            const events = eventsByGroup[group]
            if (events.length === 0) return null

            return (
              <div key={group} className="space-y-3">
                {/* Group header */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="inline-block w-4 h-px bg-gray-300 dark:bg-gray-600" />
                    <h4 className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-500 dark:text-gray-400">
                      {groupMeta.label}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 pl-7">
                    {groupMeta.description}
                  </p>
                </div>

                {/* Event rows */}
                <div className="space-y-2">
                  {events.map((eventConfig) => (
                    <EventRow
                      key={eventConfig.eventType}
                      eventConfig={eventConfig}
                      notifSettings={notif}
                      updateSettings={updateSettings}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* ── Disabled state placeholder ── */}
      {!notif.enabled && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Power Automate notifications are disabled
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Enable the master toggle above to configure webhook events.
          </p>
        </div>
      )}
    </div>
  )
}
