import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSettings } from '../../contexts/SettingsContext'
import type { PardotConfig, PardotFieldMapping, PardotSenderType, PardotEdition } from '../../types/settings.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITION_LIMITS: Record<PardotEdition, number> = {
  growth: 25000,
  plus: 50000,
  advanced: 100000,
  premium: 100000,
}

const SENDER_TYPE_LABELS: Record<PardotSenderType, string> = {
  general_user: 'General User (account default)',
  specific_user: 'Specific User (by User ID)',
  assigned_user: 'Assigned User (CRM owner)',
  account_owner: 'Account Owner',
  account_custom_field: 'Account Custom Field',
  prospect_custom_field: 'Prospect Custom Field',
}

const FORM_FIELD_OPTIONS = [
  { value: 'campaign.campaignName',  label: 'Campaign Name' },
  { value: 'campaign.emailType',     label: 'Email Type' },
  { value: 'campaign.subjectLine',   label: 'Subject Line' },
  { value: 'campaign.previewText',   label: 'Preview Text' },
  { value: 'campaign.fromName',      label: 'From Name' },
  { value: 'campaign.fromAddress',   label: 'From Address' },
  { value: 'campaign.replyToEmail',  label: 'Reply-To Email' },
  { value: 'campaign.theme',         label: 'Brand Theme' },
  { value: 'content.headline',       label: 'Headline' },
  { value: 'content.bodyIntro',      label: 'Body Intro' },
  { value: 'content.legalDisclaimer',label: 'Legal Disclaimer' },
  { value: 'content.footerSignoffId',label: 'Signoff ID' },
  { value: 'assets.heroImageUrl',    label: 'Hero Image URL' },
  { value: 'audience.pardotListId',  label: 'Pardot List ID' },
  { value: 'audience.clientGroup',   label: 'Client Group' },
  { value: 'audience.region',        label: 'Region' },
  { value: 'audience.channel',       label: 'Channel' },
  { value: 'deadlines.sendDate',     label: 'Send Date' },
  { value: 'deadlines.contentApprovalDate', label: 'Content Approval Date' },
  { value: 'deadlines.urgency',      label: 'Urgency' },
  { value: 'deadlines.tags',         label: 'Tags' },
]

const API_OBJECT_LABELS: Record<PardotFieldMapping['apiObject'], string> = {
  'list-email': 'List Email',
  prospect:     'Prospect',
  campaign:     'Campaign',
}

const DAILY_LIMIT_NOTE: Record<PardotEdition, string> = {
  growth:   '25,000 requests / day',
  plus:     '50,000 requests / day',
  advanced: '100,000 requests / day',
  premium:  '100,000 requests / day',
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
      >
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</p>
          {description && !open && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{description}</p>
          )}
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

// ─── Input helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary placeholder-gray-400 dark:placeholder-gray-600'
const monoCls = inputCls + ' font-mono'
const selectCls = inputCls

// ─── Config completeness indicator ────────────────────────────────────────────

function ConfigBadge({ cfg }: { cfg: PardotConfig }) {
  if (cfg.useMockData) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Mock data active
    </span>
  )
  const hasAuth = cfg.clientId && cfg.clientSecret && cfg.businessUnitId
  const hasProxy = cfg.apiProxyUrl
  if (hasAuth && hasProxy) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Configured
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Incomplete
    </span>
  )
}

// ─── Field Mapping Row ────────────────────────────────────────────────────────

function MappingRow({
  mapping,
  onChange,
  onDelete,
}: {
  mapping: PardotFieldMapping
  onChange: (patch: Partial<PardotFieldMapping>) => void
  onDelete: () => void
}) {
  return (
    <tr className="group border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Form field */}
      <td className="py-2 pr-2">
        <select
          value={mapping.formField}
          onChange={(e) => onChange({ formField: e.target.value })}
          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
        >
          <option value="">— Select field —</option>
          {FORM_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {!FORM_FIELD_OPTIONS.find((o) => o.value === mapping.formField) && mapping.formField && (
            <option value={mapping.formField}>{mapping.formField}</option>
          )}
        </select>
      </td>
      {/* API parameter */}
      <td className="py-2 pr-2">
        <input
          type="text"
          value={mapping.apiParameter}
          onChange={(e) => onChange({ apiParameter: e.target.value })}
          placeholder="e.g. subject or customField__c"
          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
        />
      </td>
      {/* API object */}
      <td className="py-2 pr-2">
        <select
          value={mapping.apiObject}
          onChange={(e) => onChange({ apiObject: e.target.value as PardotFieldMapping['apiObject'] })}
          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
        >
          {(Object.entries(API_OBJECT_LABELS) as [PardotFieldMapping['apiObject'], string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </td>
      {/* Notes */}
      <td className="py-2 pr-2">
        <input
          type="text"
          value={mapping.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Optional note"
          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
        />
      </td>
      {/* Delete */}
      <td className="py-2 text-center">
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove mapping"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function TabPardot() {
  const { settings, updateSettings } = useSettings()
  const cfg: PardotConfig = {
    environment: 'production',
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    apiVersion: 'v5',
    edition: 'plus',
    defaultListId: '',
    defaultCampaignId: '',
    defaultEmailTemplateId: '',
    defaultSuppressionListIds: '',
    senderType: 'general_user',
    senderUserId: '',
    replyToType: 'general_user',
    replyToAddress: '',
    fieldMappings: [],
    ...settings.pardot,
  }

  function update(patch: Partial<PardotConfig>) {
    updateSettings({ pardot: { ...cfg, ...patch } })
  }

  function updateMapping(id: string, patch: Partial<PardotFieldMapping>) {
    update({
      fieldMappings: cfg.fieldMappings.map((m) => m.id === id ? { ...m, ...patch } : m),
    })
  }

  function addMapping() {
    update({
      fieldMappings: [
        ...cfg.fieldMappings,
        { id: uuidv4(), formField: '', apiParameter: '', apiObject: 'list-email', notes: '' },
      ],
    })
  }

  function deleteMapping(id: string) {
    update({ fieldMappings: cfg.fieldMappings.filter((m) => m.id !== id) })
  }

  const derivedInstanceUrl = cfg.environment === 'sandbox'
    ? 'https://pi.demo.pardot.com'
    : 'https://pi.pardot.com'

  const derivedAuthDomain = cfg.environment === 'sandbox'
    ? 'test.salesforce.com'
    : 'login.salesforce.com'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Account Engagement (Pardot) API
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure a Salesforce Connected App to enable live list lookups, email scheduling, and campaign insights via the Account Engagement v5 REST API.
          </p>
        </div>
        <div className="shrink-0 mt-0.5">
          <ConfigBadge cfg={cfg} />
        </div>
      </div>

      {/* Mock data toggle */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <button
          type="button"
          role="switch"
          aria-checked={cfg.useMockData}
          onClick={() => update({ useMockData: !cfg.useMockData })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-1 shrink-0 mt-0.5 ${
            cfg.useMockData ? 'bg-amber-400' : 'bg-brand-primary'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cfg.useMockData ? 'translate-x-1' : 'translate-x-[18px]'}`} />
        </button>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Use simulated data
            {cfg.useMockData && (
              <span className="ml-1.5 text-xs font-normal text-amber-600 dark:text-amber-400">(currently active)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            When enabled, campaign insights and list analysis use realistic demo data seeded from campaign names. Disable once credentials are configured.
          </p>
        </div>
      </div>

      <div className={cfg.useMockData ? 'opacity-50 pointer-events-none space-y-4' : 'space-y-4'}>

        {/* ── Environment ─────────────────────────────────────────── */}
        <Section title="Environment" description="Production or Sandbox Salesforce org">
          <div className="grid grid-cols-2 gap-4">
            {(['production', 'sandbox'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => update({ environment: env, instanceUrl: env === 'sandbox' ? 'https://pi.demo.pardot.com' : 'https://pi.pardot.com' })}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  cfg.environment === env
                    ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  cfg.environment === env ? 'border-brand-primary' : 'border-gray-400'
                }`}>
                  {cfg.environment === env && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{env}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {env === 'production'
                      ? `${derivedAuthDomain} · pi.pardot.com`
                      : `test.salesforce.com · pi.demo.pardot.com`}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="API Version" hint="v5 is recommended for all new integrations.">
              <select
                value={cfg.apiVersion}
                onChange={(e) => update({ apiVersion: e.target.value as 'v5' | 'v4' })}
                className={selectCls}
              >
                <option value="v5">v5 (recommended)</option>
                <option value="v4">v4 (legacy AMPSEA)</option>
              </select>
            </Field>
            <Field label="Account Edition" hint={`Daily API limit: ${DAILY_LIMIT_NOTE[cfg.edition]}`}>
              <select
                value={cfg.edition}
                onChange={(e) => update({ edition: e.target.value as PardotEdition })}
                className={selectCls}
              >
                <option value="growth">Growth — 25k req/day</option>
                <option value="plus">Plus — 50k req/day</option>
                <option value="advanced">Advanced — 100k req/day</option>
                <option value="premium">Premium — 100k req/day</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* ── Connected App ────────────────────────────────────────── */}
        <Section title="Connected App — OAuth 2.0" description="Salesforce Consumer Key and Secret">
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p className="font-medium">Setup path in Salesforce</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600 dark:text-blue-500">
              <li>Setup → App Manager → New Connected App (or External Client Manager)</li>
              <li>Enable OAuth Settings → add the redirect URI below</li>
              <li>Add scope: <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">pardot_api</code> and <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">refresh_token</code></li>
              <li>Wait up to 15 minutes for propagation, then copy Consumer Key &amp; Secret</li>
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Consumer Key (Client ID)" hint="From the Connected App → OAuth Settings.">
              <input
                type="text"
                value={cfg.clientId}
                onChange={(e) => update({ clientId: e.target.value })}
                placeholder="3MVG9..."
                className={monoCls}
                autoComplete="off"
              />
            </Field>
            <Field label="Consumer Secret (Client Secret)" hint="Store securely — treated as a password.">
              <input
                type="password"
                value={cfg.clientSecret}
                onChange={(e) => update({ clientSecret: e.target.value })}
                placeholder="••••••••••••••••"
                className={monoCls}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <Field
            label="OAuth Redirect URI"
            hint={`Must match exactly what's registered on the Connected App. Your proxy or backend handles the callback.`}
          >
            <input
              type="url"
              value={cfg.redirectUri}
              onChange={(e) => update({ redirectUri: e.target.value })}
              placeholder="https://your-proxy.example.com/oauth/callback"
              className={inputCls}
            />
          </Field>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 font-mono text-[10px] text-gray-500 dark:text-gray-400 break-all">
            <span className="text-gray-400 dark:text-gray-500">Authorization URL → </span>
            <span className="text-gray-700 dark:text-gray-300">
              https://{derivedAuthDomain}/services/oauth2/authorize?response_type=code&client_id={cfg.clientId || '<CLIENT_ID>'}&redirect_uri={cfg.redirectUri || '<REDIRECT_URI>'}
            </span>
          </div>
        </Section>

        {/* ── Business Unit & Proxy ────────────────────────────────── */}
        <Section title="Business Unit & API Proxy" description="Business Unit ID and server-side proxy URL">
          <Field
            label="Business Unit ID"
            hint="Found at Marketing Setup → Pardot Account Setup. 18 characters, starts with 0Uv. Required on every API request as the Pardot-Business-Unit-Id header."
          >
            <input
              type="text"
              value={cfg.businessUnitId}
              onChange={(e) => update({ businessUnitId: e.target.value })}
              placeholder="0Uv000000000000AAA"
              maxLength={18}
              className={monoCls}
            />
            {cfg.businessUnitId && cfg.businessUnitId.length !== 18 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                ⚠ Business Unit ID should be exactly 18 characters ({cfg.businessUnitId.length} entered)
              </p>
            )}
          </Field>
          <Field
            label="API Proxy URL"
            hint="Account Engagement does not allow direct browser requests (no CORS). Deploy a Cloudflare Worker, Vercel Edge Function, or n8n webhook that: (1) holds your OAuth tokens, (2) refreshes them automatically, and (3) forwards requests to the Account Engagement REST API with the correct headers."
          >
            <input
              type="url"
              value={cfg.apiProxyUrl}
              onChange={(e) => update({ apiProxyUrl: e.target.value })}
              placeholder="https://your-proxy.workers.dev/pardot"
              className={inputCls}
            />
          </Field>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Derived endpoints</p>
            <dl className="space-y-1 font-mono text-[10px] text-gray-600 dark:text-gray-400">
              <div className="flex gap-2">
                <dt className="text-gray-400 dark:text-gray-500 shrink-0 w-24">API base</dt>
                <dd className="break-all">{derivedInstanceUrl}/api/{cfg.apiVersion}/objects/</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 dark:text-gray-500 shrink-0 w-24">Auth domain</dt>
                <dd>https://{derivedAuthDomain}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-400 dark:text-gray-500 shrink-0 w-24">Token URL</dt>
                <dd>https://{derivedAuthDomain}/services/oauth2/token</dd>
              </div>
            </dl>
          </div>
        </Section>

        {/* ── Email Defaults ───────────────────────────────────────── */}
        <Section title="Email & List Defaults" description="Default IDs pre-filled in API requests" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Recipient List ID" hint="Pardot list ID used when the brief has no explicit list.">
              <input
                type="text"
                value={cfg.defaultListId}
                onChange={(e) => update({ defaultListId: e.target.value })}
                placeholder="e.g. 12345"
                className={monoCls}
              />
            </Field>
            <Field label="Default Campaign ID" hint="Pardot campaign to associate with list emails by default.">
              <input
                type="text"
                value={cfg.defaultCampaignId}
                onChange={(e) => update({ defaultCampaignId: e.target.value })}
                placeholder="e.g. 67890"
                className={monoCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Email Template ID" hint="Integer template ID — overridden by campaign presets.">
              <input
                type="text"
                value={cfg.defaultEmailTemplateId}
                onChange={(e) => update({ defaultEmailTemplateId: e.target.value })}
                placeholder="e.g. 1001"
                className={monoCls}
              />
            </Field>
            <Field label="Suppression List IDs" hint="Comma-separated list IDs. Always excluded from sends.">
              <input
                type="text"
                value={cfg.defaultSuppressionListIds}
                onChange={(e) => update({ defaultSuppressionListIds: e.target.value })}
                placeholder="e.g. 111, 222, 333"
                className={monoCls}
              />
            </Field>
          </div>
        </Section>

        {/* ── Sender Configuration ─────────────────────────────────── */}
        <Section title="Sender & Reply-To" description="Default sender and reply-to configuration for list emails" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sender Type" hint="How the From address is resolved by Account Engagement.">
              <select
                value={cfg.senderType}
                onChange={(e) => update({ senderType: e.target.value as PardotSenderType })}
                className={selectCls}
              >
                {(Object.entries(SENDER_TYPE_LABELS) as [PardotSenderType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            {(cfg.senderType === 'specific_user') && (
              <Field label="Sender User ID" hint="Salesforce User ID of the designated sender.">
                <input
                  type="text"
                  value={cfg.senderUserId}
                  onChange={(e) => update({ senderUserId: e.target.value })}
                  placeholder="005..."
                  className={monoCls}
                />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reply-To Type" hint="How the Reply-To address is resolved.">
              <select
                value={cfg.replyToType}
                onChange={(e) => update({ replyToType: e.target.value as PardotSenderType })}
                className={selectCls}
              >
                {(Object.entries(SENDER_TYPE_LABELS) as [PardotSenderType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            {(cfg.replyToType === 'specific_user') && (
              <Field label="Reply-To Address" hint="Static reply-to email address.">
                <input
                  type="email"
                  value={cfg.replyToAddress}
                  onChange={(e) => update({ replyToAddress: e.target.value })}
                  placeholder="replies@ninetyone.com"
                  className={inputCls}
                />
              </Field>
            )}
          </div>
          <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
            <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">senderOptions payload</p>
            <pre className="font-mono whitespace-pre-wrap break-all text-gray-500 dark:text-gray-500">{JSON.stringify(
              { type: cfg.senderType, ...(cfg.senderType === 'specific_user' ? { userId: cfg.senderUserId } : {}) },
              null, 2
            )}</pre>
          </div>
        </Section>

        {/* ── Field Mappings ───────────────────────────────────────── */}
        <Section title="Field Mappings" description="Map brief form fields to Account Engagement API parameters">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Define how brief fields map to Account Engagement API parameters when submitting to the pipeline.
            Use <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">fieldName__c</code> for custom prospect/campaign fields.
          </p>

          {cfg.fieldMappings.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-[28%]">Brief Form Field</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-[28%]">API Parameter</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-[18%]">Object</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 px-3">
                  {cfg.fieldMappings.map((mapping) => (
                    <tr key={mapping.id} className="group">
                      <td className="px-3 py-1.5">
                        <select
                          value={mapping.formField}
                          onChange={(e) => updateMapping(mapping.id, { formField: e.target.value })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        >
                          <option value="">— Select —</option>
                          {FORM_FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                          {!FORM_FIELD_OPTIONS.find((o) => o.value === mapping.formField) && mapping.formField && (
                            <option value={mapping.formField}>{mapping.formField}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={mapping.apiParameter}
                          onChange={(e) => updateMapping(mapping.id, { apiParameter: e.target.value })}
                          placeholder="e.g. subject"
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={mapping.apiObject}
                          onChange={(e) => updateMapping(mapping.id, { apiObject: e.target.value as PardotFieldMapping['apiObject'] })}
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        >
                          {(Object.entries(API_OBJECT_LABELS) as [PardotFieldMapping['apiObject'], string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={mapping.notes}
                          onChange={(e) => updateMapping(mapping.id, { notes: e.target.value })}
                          placeholder="Optional note"
                          className="w-full text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-primary/50"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteMapping(mapping.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove mapping"
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
            <p className="text-xs text-gray-400 dark:text-gray-500 italic py-4 text-center">
              No field mappings defined. Add one below.
            </p>
          )}

          <button
            type="button"
            onClick={addMapping}
            className="text-xs font-medium text-brand-primary dark:text-brand-accent px-3 py-1.5 rounded border border-brand-primary/30 dark:border-brand-accent/30 hover:bg-brand-primary/5 transition-colors"
          >
            + Add Mapping
          </button>

          {/* Common API parameters reference */}
          <details className="group">
            <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 list-none flex items-center gap-1.5">
              <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              Common Account Engagement API parameters
            </summary>
            <div className="mt-2 overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Parameter</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Object</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { param: 'name',                   obj: 'list-email', desc: 'Internal email label' },
                    { param: 'subject',                obj: 'list-email', desc: 'Email subject line' },
                    { param: 'campaignId',             obj: 'list-email', desc: 'Pardot campaign ID' },
                    { param: 'recipientListIds',       obj: 'list-email', desc: 'Array of list IDs to send to' },
                    { param: 'suppressionListIds',     obj: 'list-email', desc: 'Array of list IDs to exclude' },
                    { param: 'scheduledTime',          obj: 'list-email', desc: 'ISO 8601 scheduled send time' },
                    { param: 'emailTemplateId',        obj: 'list-email', desc: 'Integer template ID' },
                    { param: 'senderOptions.name',     obj: 'list-email', desc: 'From Name' },
                    { param: 'senderOptions.address',  obj: 'list-email', desc: 'From Email Address' },
                    { param: 'replyToOptions.address', obj: 'list-email', desc: 'Reply-To Address' },
                    { param: 'isOperational',          obj: 'list-email', desc: 'Bypass opt-out (transactional)' },
                    { param: 'htmlMessage',            obj: 'list-email', desc: 'HTML body (write-only)' },
                    { param: 'email',                  obj: 'prospect',   desc: 'Prospect email address' },
                    { param: 'firstName',              obj: 'prospect',   desc: 'First name' },
                    { param: 'campaignId',             obj: 'prospect',   desc: 'Pardot campaign ID' },
                    { param: 'score',                  obj: 'prospect',   desc: 'Prospect score' },
                    { param: 'customField__c',         obj: 'prospect',   desc: 'Custom field (append __c suffix)' },
                  ].map(({ param, obj, desc }) => (
                    <tr key={param} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{param}</td>
                      <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{API_OBJECT_LABELS[obj as PardotFieldMapping['apiObject']]}</td>
                      <td className="px-3 py-1.5 text-gray-400 dark:text-gray-500">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Section>

        {/* ── Rate limits info ─────────────────────────────────────── */}
        <Section title="API Limits" description="Account Engagement rate limit reference" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(EDITION_LIMITS) as [PardotEdition, number][]).map(([edition, limit]) => (
              <div
                key={edition}
                className={`p-3 rounded-lg border text-center ${
                  cfg.edition === edition
                    ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
                }`}
              >
                <p className={`text-sm font-bold ${cfg.edition === edition ? 'text-brand-primary dark:text-brand-accent' : 'text-gray-700 dark:text-gray-300'}`}>
                  {limit.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{edition} · per day</p>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>Max concurrent connections: <strong className="text-gray-700 dark:text-gray-300">5</strong></p>
            <p>Error 122 = daily limit exceeded · Error 66 = concurrent limit exceeded</p>
            <p>Pagination: token-based via <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">nextPageToken</code>, expires after 4 hours, max 100k records per sequence.</p>
          </div>
        </Section>

      </div>
    </div>
  )
}
