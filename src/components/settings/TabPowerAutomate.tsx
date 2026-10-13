import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { PowerAutomateConfig, PowerAutomateFlowEndpoint, PowerAutomateFieldMapping } from '../../types/settings.types'
import { testFlowWebhook } from '../../lib/powerAutomateService'

// ─── Constants ────────────────────────────────────────────────────────────────

const BRIEF_FIELD_OPTIONS = [
  { value: 'meta.briefId',                   label: 'Brief ID' },
  { value: 'meta.status',                    label: 'Brief Status' },
  { value: 'campaign.campaignName',          label: 'Campaign Name' },
  { value: 'campaign.emailType',             label: 'Email Type' },
  { value: 'campaign.theme',                 label: 'Brand Theme' },
  { value: 'campaign.subjectLine',           label: 'Subject Line' },
  { value: 'campaign.previewText',           label: 'Preview Text' },
  { value: 'campaign.fromName',              label: 'From Name' },
  { value: 'campaign.replyToEmail',          label: 'Reply-To Email' },
  { value: 'audience.region',               label: 'Region' },
  { value: 'audience.channel',              label: 'Channel' },
  { value: 'audience.estimatedListSize',    label: 'Estimated List Size' },
  { value: 'audience.pardotListId',         label: 'Pardot List ID' },
  { value: 'content.headline',              label: 'Headline' },
  { value: 'content.bodyIntro',             label: 'Body Intro' },
  { value: 'content.cta.label',             label: 'CTA Label' },
  { value: 'content.cta.url',              label: 'CTA URL' },
  { value: 'assets.heroImageUrl',           label: 'Hero Image URL' },
  { value: 'deadlines.sendDate',            label: 'Send Date' },
  { value: 'deadlines.contentApprovalDate', label: 'Content Approval Date' },
  { value: 'deadlines.urgency',             label: 'Urgency' },
  { value: 'deadlines.notes',              label: 'Notes' },
]

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</p>
            {description && !open && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
          {badge}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-4 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-4 space-y-4">
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary placeholder-gray-400 dark:placeholder-gray-500'
const monoCls  = inputCls + ' font-mono text-xs'

// ─── Status badge ─────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

// ─── Flow endpoint card ───────────────────────────────────────────────────────

function FlowCard({
  label,
  description,
  icon,
  endpoint,
  paConfig,
  onChange,
}: {
  label: string
  description: string
  icon: React.ReactNode
  endpoint: PowerAutomateFlowEndpoint
  paConfig: PowerAutomateConfig
  onChange: (patch: Partial<PowerAutomateFlowEndpoint>) => void
}) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')

  async function runTest() {
    if (!endpoint.webhookUrl.trim()) {
      setTestStatus('error')
      setTestMessage('Enter a webhook URL first.')
      return
    }
    setTestStatus('testing')
    setTestMessage('')
    const result = await testFlowWebhook(paConfig, endpoint.webhookUrl)
    if (result.ok) {
      setTestStatus('success')
      setTestMessage(`Flow responded with HTTP ${result.status} ✓`)
    } else {
      setTestStatus('error')
      setTestMessage(result.error)
    }
  }

  const isConfigured = !!endpoint.webhookUrl.trim()

  return (
    <div className={`rounded-lg border p-4 space-y-3 transition-colors ${
      endpoint.enabled && isConfigured
        ? 'border-brand-primary/30 dark:border-brand-accent/30 bg-brand-primary/[0.02] dark:bg-brand-accent/5'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-brand-primary dark:text-brand-accent shrink-0">{icon}</span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {/* Enable toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={endpoint.enabled}
          onClick={() => onChange({ enabled: !endpoint.enabled })}
          title={endpoint.enabled ? 'Disable this flow' : 'Enable this flow'}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 mt-0.5 ${
            endpoint.enabled && isConfigured ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${endpoint.enabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Webhook URL */}
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Webhook URL
        </label>
        <input
          type="url"
          value={endpoint.webhookUrl}
          onChange={(e) => onChange({ webhookUrl: e.target.value })}
          placeholder="https://prod-xx.westus.logic.azure.com:443/workflows/..."
          className={monoCls + ' text-[11px]'}
          spellCheck={false}
        />
      </div>

      {/* Test row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={runTest}
          disabled={testStatus === 'testing' || !endpoint.webhookUrl.trim()}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {testStatus === 'testing' ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
              </svg>
              Send test
            </>
          )}
        </button>
        {testStatus === 'success' && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            {testMessage}
          </span>
        )}
        {testStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 max-w-sm">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="break-words">{testMessage}</span>
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Setup Guide ──────────────────────────────────────────────────────────────

function SetupGuide() {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Prerequisites',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">Before you start, confirm you have:</p>
          <ul className="space-y-2">
            {[
              { label: 'Power Automate Premium license (or pay-per-use)',     note: 'The "When an HTTP request is received" trigger is a Premium connector.' },
              { label: 'Pardot (Account Engagement) connector access in PA',  note: 'Available under the Salesforce / Marketing Cloud connectors.' },
              { label: 'Pardot Classic credentials already set up in PA',     note: 'You\'ll authenticate inside Power Automate — not in this app.' },
              { label: 'Microsoft 365 account with Power Automate access',    note: 'flow.microsoft.com or your tenant URL.' },
            ].map(({ label, note }) => (
              <li key={label} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded-full border-2 border-brand-primary dark:border-brand-accent shrink-0 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary dark:bg-brand-accent" />
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: 'Create the Brief Submission flow',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <p>This flow runs every time a brief is submitted from this app.</p>
          <ol className="space-y-3 list-none">
            {[
              { n: 1, t: 'Go to flow.microsoft.com → Create → Instant cloud flow' },
              { n: 2, t: 'Choose trigger: "When an HTTP request is received"' },
              { n: 3, t: 'Set Method to POST. Leave the JSON schema blank for now — it auto-generates after the first test.' },
              { n: 4, t: 'Save the flow. Copy the HTTP POST URL that appears in the trigger card.' },
              { n: 5, t: 'Paste that URL into the "Brief Submission Flow" webhook URL field above.' },
              { n: 6, t: 'Click "Send test" in this tab to fire a sample payload. Open the flow run history to see the incoming JSON.' },
              { n: 7, t: 'Back in Power Automate, click "Generate from sample" in the trigger and paste the sample JSON — this gives you typed fields to use in later steps.' },
            ].map(({ n, t }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-primary/10 dark:bg-brand-accent/20 text-brand-primary dark:text-brand-accent text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      title: 'Add Pardot actions to the flow',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <p>Inside the Brief Submission flow, add steps after the HTTP trigger:</p>
          <div className="space-y-3">
            {[
              {
                heading: 'Option A — Create a Pardot List Email draft',
                steps: [
                  'Add action: Salesforce Marketing Cloud Account Engagement → Create a list email',
                  'Map fields: Name ← campaignName, Subject ← subjectLine, Campaign ID ← your Pardot campaign ID',
                  'Set Recipient List ← pardotListId from the trigger body',
                  'Optionally set Scheduled Time ← sendDate',
                ],
              },
              {
                heading: 'Option B — Add/update a Pardot Prospect',
                steps: [
                  'Add action: Account Engagement → Upsert a prospect',
                  'Map email address, campaign, and any custom fields from the brief payload',
                ],
              },
              {
                heading: 'Option C — Send an approval email before Pardot action',
                steps: [
                  'Add action: Outlook → Send an email (notify the producer)',
                  'Add a condition or Approval action before the Pardot step',
                ],
              },
            ].map(({ heading, steps }) => (
              <div key={heading} className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-1.5">
                <p className="font-semibold text-gray-700 dark:text-gray-300 text-[11px]">{heading}</p>
                <ol className="list-decimal list-inside space-y-1">
                  {steps.map((s) => <li key={s} className="text-[10px]">{s}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Create the List Analysis flow',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <p>This flow is triggered when a user requests Pardot list health data in the brief form.</p>
          <ol className="space-y-3 list-none">
            {[
              { n: 1, t: 'Create a new Instant cloud flow with the same "When an HTTP request is received" trigger.' },
              { n: 2, t: 'The incoming body will contain { "listId": "12345", "triggeredAt": "..." }.' },
              { n: 3, t: 'Add action: Account Engagement → Get a list (pass listId from trigger body).' },
              { n: 4, t: 'Add action: HTTP → POST the list data back to this app\'s /api/pa/list-callback endpoint (see next step), or send it to a SharePoint list / Teams channel for manual review.' },
              { n: 5, t: 'Paste the webhook URL into "List Analysis Flow" above and click "Send test".' },
            ].map(({ n, t }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-primary/10 dark:bg-brand-accent/20 text-brand-primary dark:text-brand-accent text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      title: 'Secure the flows (optional but recommended)',
      content: (
        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <p>The webhook URL contains a built-in SAS token that acts as a secret. For an extra layer of security:</p>
          <ol className="space-y-3 list-none">
            {[
              { n: 1, t: 'Choose a secret value (e.g. a UUID). Enter it in the "Shared Secret" field below in this settings panel.' },
              { n: 2, t: 'In your Power Automate flow, add a condition at the top: triggerOutputs()?[\'headers\'][\'x-api-key\'] equals your secret.' },
              { n: 3, t: 'If the condition fails, add a "Terminate" action with status "Cancelled". This rejects requests that don\'t carry the secret.' },
              { n: 4, t: 'The app will automatically send your secret in every request using the header name you configure here.' },
            ].map(({ n, t }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-brand-primary/10 dark:bg-brand-accent/20 text-brand-primary dark:text-brand-accent text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-[10px]">
            <p className="font-semibold mb-1">⚠ Never share your webhook URLs</p>
            <p>The SAS token embedded in the URL grants anyone who has it the ability to trigger your flows. Treat it like a password — regenerate it if compromised (Power Automate → flow → trigger settings → Regenerate).</p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Step nav */}
      <div className="flex gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
              step === i
                ? 'border-brand-primary bg-brand-primary text-white dark:border-brand-accent dark:bg-brand-accent dark:text-gray-900'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400'
            }`}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-brand-primary dark:text-brand-accent uppercase tracking-wider mb-3">
          Step {step + 1} — {steps[step].title}
        </p>
        {steps[step].content}
      </div>

      {/* Prev / Next */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="text-xs px-3 py-1.5 rounded border border-brand-primary/40 dark:border-brand-accent/40 text-brand-primary dark:text-brand-accent hover:bg-brand-primary/5 disabled:opacity-30 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

// ─── Sample payload viewer ────────────────────────────────────────────────────

function SamplePayload({ config }: { config: PowerAutomateConfig }) {
  const [copied, setCopied] = useState(false)

  const sample = {
    triggeredAt:         new Date().toISOString(),
    source:              'Ninety One Email Briefing',
    briefId:             'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    status:              'submitted',
    campaignName:        'SA Advisors — Taking Stock April 2026',
    emailType:           'newsletter',
    theme:               'leatherback-coral',
    subjectLine:         'Taking Stock — April 2026',
    previewText:         'Your monthly investment insights from Ninety One',
    fromName:            'Ninety One',
    replyToEmail:        'marketing@ninetyone.com',
    region:              ['ZA'],
    channel:             ['INTERMEDIARY'],
    estimatedListSize:   4200,
    pardotListId:        '12345',
    headline:            'Monthly Investment Update',
    ctaLabel:            'Read more',
    ctaUrl:              'https://ninetyone.com',
    sendDate:            '2026-04-30',
    contentApprovalDate: '2026-04-28',
    urgency:             'standard',
    notes:               '',
    ...(config.includeFullBrief ? { brief: '{ ...full BriefPayload object... }' } : {}),
  }

  function copy() {
    navigator.clipboard.writeText(JSON.stringify(sample, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Sample Brief Submission payload
        </p>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] font-medium text-brand-primary dark:text-brand-accent hover:underline"
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre className="text-[10px] font-mono text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto max-h-64 leading-relaxed">
        {JSON.stringify(sample, null, 2)}
      </pre>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function TabPowerAutomate() {
  const { settings, updateSettings } = useSettings()

  const defaultCfg: PowerAutomateConfig = {
    enabled: false,
    briefSubmissionFlow:  { webhookUrl: '', enabled: false },
    listAnalysisFlow:     { webhookUrl: '', enabled: false },
    campaignInsightsFlow: { webhookUrl: '', enabled: false },
    secretHeaderName:  'x-api-key',
    secretHeaderValue: '',
    includeFullBrief:      true,
    includeCampaignConfig: false,
    includeKanbanData:     false,
    retryOnFailure:   true,
    timeoutSeconds:   30,
    fieldMappings:    [],
  }

  const cfg: PowerAutomateConfig = { ...defaultCfg, ...settings.powerAutomate }

  function update(patch: Partial<PowerAutomateConfig>) {
    updateSettings({ powerAutomate: { ...cfg, ...patch } })
  }

  function updateFlow(
    key: 'briefSubmissionFlow' | 'listAnalysisFlow' | 'campaignInsightsFlow',
    patch: Partial<PowerAutomateFlowEndpoint>,
  ) {
    update({ [key]: { ...cfg[key], ...patch } })
  }

  function addMapping() {
    update({
      fieldMappings: [
        ...cfg.fieldMappings,
        { id: uuidv4(), briefField: '', flowParameter: '', notes: '' },
      ],
    })
  }

  function updateMapping(id: string, patch: Partial<PowerAutomateFieldMapping>) {
    update({ fieldMappings: cfg.fieldMappings.map((m) => m.id === id ? { ...m, ...patch } : m) })
  }

  function deleteMapping(id: string) {
    update({ fieldMappings: cfg.fieldMappings.filter((m) => m.id !== id) })
  }

  const configuredFlowCount = [
    cfg.briefSubmissionFlow,
    cfg.listAnalysisFlow,
    cfg.campaignInsightsFlow,
  ].filter((f) => f.enabled && f.webhookUrl.trim()).length

  const statusBadge = cfg.enabled
    ? configuredFlowCount > 0
      ? <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {configuredFlowCount} flow{configuredFlowCount !== 1 ? 's' : ''} active
        </span>
      : <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Enabled — no flows configured
        </span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Disabled
      </span>

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Microsoft Power Automate
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-lg">
            Connect the brief form to Power Automate HTTP-trigger flows. When a brief is submitted,
            Power Automate receives the payload and can create Pardot list emails, update prospects,
            send approval emails, write to SharePoint, or trigger any other connector — without
            needing API credentials in this app.
          </p>
        </div>
        <div className="shrink-0 mt-0.5">{statusBadge}</div>
      </div>

      {/* ── Master toggle ────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <button
          type="button"
          role="switch"
          aria-checked={cfg.enabled}
          onClick={() => update({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 shrink-0 mt-0.5 ${
            cfg.enabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cfg.enabled ? 'translate-x-[18px]' : 'translate-x-1'}`} />
        </button>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Enable Power Automate integration
            {cfg.enabled && (
              <span className="ml-1.5 text-xs font-normal text-brand-primary dark:text-brand-accent">(active)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            When enabled, brief submissions and data requests fire the configured webhook flows.
            Individual flows can still be toggled independently below.
          </p>
        </div>
      </div>

      <div className={cfg.enabled ? 'space-y-4' : 'space-y-4 opacity-50 pointer-events-none'}>

        {/* ── How it works ─────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20">
          <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-semibold">How this works</p>
            <p>
              This app sends a <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">POST</span> request
              to your Power Automate webhook URL. PA receives the brief JSON, then uses the
              native <strong>Pardot (Account Engagement)</strong> connector to perform actions —
              creating list emails, updating prospects, sending approvals — with no Pardot credentials
              stored in this app. You authenticate to Pardot once inside Power Automate.
            </p>
          </div>
        </div>

        {/* ── Flow Endpoints ───────────────────────────────────── */}
        <Section
          title="Flow Endpoints"
          description="Configure a webhook URL for each flow you want to trigger"
          badge={configuredFlowCount > 0
            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium ml-2">{configuredFlowCount} active</span>
            : undefined}
        >
          <FlowCard
            label="Brief Submission"
            description="Fires when a brief is submitted. Sends campaign, audience, content, and deadline data to Power Automate."
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
            }
            endpoint={cfg.briefSubmissionFlow}
            paConfig={cfg}
            onChange={(patch) => updateFlow('briefSubmissionFlow', patch)}
          />

          <FlowCard
            label="List Analysis"
            description="Fires when a user requests Pardot list health data for a brief. Sends the Pardot List ID."
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
            endpoint={cfg.listAnalysisFlow}
            paConfig={cfg}
            onChange={(patch) => updateFlow('listAnalysisFlow', patch)}
          />

          <FlowCard
            label="Campaign Insights"
            description="Fires when a user requests campaign performance data. Sends the Pardot Campaign ID."
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            }
            endpoint={cfg.campaignInsightsFlow}
            paConfig={cfg}
            onChange={(patch) => updateFlow('campaignInsightsFlow', patch)}
          />
        </Section>

        {/* ── Security ─────────────────────────────────────────── */}
        <Section title="Security" description="Optional shared secret sent as a request header" defaultOpen={false}>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-semibold text-gray-600 dark:text-gray-300">About webhook security</p>
            <p>
              Power Automate webhook URLs already contain a built-in Azure SAS token — anyone with the URL can trigger
              your flow. Adding a shared-secret header gives you a second layer: your flow can check that the header
              matches before proceeding.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Header name"
              hint='The HTTP header this app sends with every request. Use lowercase, e.g. "x-api-key".'
            >
              <input
                type="text"
                value={cfg.secretHeaderName}
                onChange={(e) => update({ secretHeaderName: e.target.value })}
                placeholder="x-api-key"
                className={monoCls}
              />
            </Field>
            <Field
              label="Header value (secret)"
              hint="The secret value. Configure your flow to validate this using triggerOutputs()?['headers']['x-api-key']."
            >
              <input
                type="password"
                value={cfg.secretHeaderValue}
                onChange={(e) => update({ secretHeaderValue: e.target.value })}
                placeholder="••••••••••••••••"
                className={monoCls}
                autoComplete="new-password"
              />
            </Field>
          </div>
          {cfg.secretHeaderName && cfg.secretHeaderValue && (
            <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 font-mono text-[10px] text-gray-500 dark:text-gray-400">
              <span className="text-gray-400">Power Automate condition expression → </span>
              <span className="text-gray-700 dark:text-gray-300 break-all">
                {`triggerOutputs()?['headers']['${cfg.secretHeaderName}']`} equals <em>your secret</em>
              </span>
            </div>
          )}
        </Section>

        {/* ── Payload Options ──────────────────────────────────── */}
        <Section title="Payload Options" description="Control what is included in each outgoing request" defaultOpen={false}>
          <div className="space-y-3">
            {([
              {
                key: 'includeFullBrief' as const,
                label: 'Include full brief JSON',
                desc: 'Appends the complete BriefPayload object as brief: { … }. Useful for creating email HTML or archiving. Increases payload size.',
              },
              {
                key: 'includeCampaignConfig' as const,
                label: 'Include campaign config metadata',
                desc: 'Appends sender preset, content preset, and campaign settings from the Settings panel.',
              },
              {
                key: 'includeKanbanData' as const,
                label: 'Include Kanban card metadata',
                desc: 'Appends kanbanCardId, column, and urgency if a Kanban card exists for this brief.',
              },
              {
                key: 'retryOnFailure' as const,
                label: 'Retry once on network failure',
                desc: 'If the webhook returns a network-level error, waits 5 s and retries once. HTTP error responses (4xx/5xx) are not retried.',
              },
            ] as const).map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg[key]}
                  onChange={(e) => update({ [key]: e.target.checked })}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
          <Field label="Request timeout (seconds)" hint="How long to wait for the flow to respond before treating the request as failed. Range: 3–60 s.">
            <input
              type="number"
              min={3}
              max={60}
              value={cfg.timeoutSeconds}
              onChange={(e) => update({ timeoutSeconds: Math.min(60, Math.max(3, Number(e.target.value))) })}
              className={inputCls + ' w-28'}
            />
          </Field>
        </Section>

        {/* ── Field Mappings ───────────────────────────────────── */}
        <Section title="Custom Field Mappings" description="Map brief fields to named input parameters in your flows" defaultOpen={false}>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The default payload already includes the most common brief fields. Use mappings here if your Power Automate
            flow expects differently-named input parameters, or to surface nested fields at the top level of the payload.
          </p>

          {cfg.fieldMappings.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-[35%]">Brief field</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-[35%]">Flow parameter name</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {cfg.fieldMappings.map((m) => (
                    <tr key={m.id} className="group">
                      <td className="px-3 py-1.5">
                        <select
                          value={m.briefField}
                          onChange={(e) => updateMapping(m.id, { briefField: e.target.value })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        >
                          <option value="">— Select —</option>
                          {BRIEF_FIELD_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={m.flowParameter}
                          onChange={(e) => updateMapping(m.id, { flowParameter: e.target.value })}
                          placeholder="e.g. EmailSubject"
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={m.notes}
                          onChange={(e) => updateMapping(m.id, { notes: e.target.value })}
                          placeholder="Optional"
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMapping(m.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic py-3 text-center">No custom mappings. Default payload fields are always included.</p>
          )}

          <button
            type="button"
            onClick={addMapping}
            className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
          >
            + Add Mapping
          </button>
        </Section>

        {/* ── Sample Payload ───────────────────────────────────── */}
        <Section title="Sample Payload" description="Preview what Power Automate will receive on brief submission" defaultOpen={false}>
          <SamplePayload config={cfg} />
        </Section>

        {/* ── Setup Guide ──────────────────────────────────────── */}
        <Section title="Setup Guide" description="Step-by-step instructions for creating the flows in Power Automate" defaultOpen={false}>
          <SetupGuide />
        </Section>

      </div>
    </div>
  )
}
