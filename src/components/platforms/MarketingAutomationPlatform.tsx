import { useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useMAFieldConfig } from '../../hooks/useMAFieldConfig'
import { MAFieldSettingsPanel } from './MAFieldSettingsPanel'
import { MAFieldConfig, DYNAMIC_LIST_SECTIONS } from '../../lib/maFieldConfig'

// ── Types ────────────────────────────────────────────────────────────────────

type TriggerType =
  | 'scheduled-cron'
  | 'webhook-event'
  | 'user-action'
  | 'api-call'
  | 'file-upload'
  | 'email-received'
  | 'database-change'
  | 'message-queue'
  | 'manual'

type Platform =
  | 'web-app'
  | 'backend-service'
  | 'data-pipeline'
  | 'api-integration'
  | 'n8n'
  | 'zapier'
  | 'make'
  | 'python-script'
  | 'node-script'
  | 'supabase-edge-function'
  | 'other'

type Hosting =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'vercel'
  | 'supabase'
  | 'on-premise'
  | 'mixed'
  | 'unknown'

type StepType = 'data-fetch' | 'transform' | 'decision' | 'action' | 'notification' | 'storage' | 'external-call' | 'loop' | 'wait'
type AuthMethod = 'api-key' | 'oauth2' | 'basic' | 'jwt' | 'service-account' | 'none' | 'other'
type Priority = 'low' | 'medium' | 'high' | 'critical'

interface WorkflowStep {
  name: string
  type: StepType
  description: string
  inputs: string
  outputs: string
  errorHandling: string
}

interface Integration {
  systemName: string
  purpose: string
  authMethod: AuthMethod
  apiDocs: string
  notes: string
}

interface AcceptanceCriteria {
  scenario: string
  given: string
  when: string
  then: string
}

interface Risk {
  description: string
  likelihood: 'low' | 'medium' | 'high'
  mitigation: string
}

interface PRDBriefFormData {
  // 1. Project Identity
  projectName: string
  projectCode: string
  oneLiner: string
  priority: Priority
  targetDate: string
  owner: string

  // 2. Problem & Goals
  problemStatement: string
  desiredOutcome: string
  outOfScope: string
  successMetrics: string

  // 3. Technical Context
  platform: Platform
  customPlatform: string
  currentTechStack: string
  hosting: Hosting
  existingCodebase: string
  relatedDocs: string

  // 4. Trigger & Schedule
  triggerType: TriggerType
  triggerDetails: string
  schedule: string
  estimatedVolume: string
  estimatedFrequency: string

  // 5. Workflow Steps
  steps: WorkflowStep[]

  // 6. Integrations
  integrations: Integration[]

  // 7. Data
  inputSchema: string
  outputSchema: string
  transformationRules: string
  dataRetention: string
  piiPresent: boolean

  // 8. Non-Functional Requirements
  performanceTargets: string
  securityRequirements: string
  complianceRequirements: string
  loggingRequirements: string
  monitoringRequirements: string
  errorStrategy: string

  // 9. Acceptance Criteria
  acceptanceCriteria: AcceptanceCriteria[]

  // 10. Constraints & Risks
  assumptions: string
  constraints: string
  risks: Risk[]

  // 11. Claude Code Notes
  claudeNotes: string
  referenceMaterials: string
  preferredApproach: string

  // Custom fields (key → string | boolean)
  customFields: Record<string, string | boolean>
}

// ── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS: { value: TriggerType; label: string; desc: string }[] = [
  { value: 'scheduled-cron', label: 'Scheduled / Cron', desc: 'Runs at a fixed interval' },
  { value: 'webhook-event', label: 'Webhook / Event', desc: 'Triggered by an incoming HTTP call' },
  { value: 'user-action', label: 'User Action', desc: 'Triggered by a user in the UI' },
  { value: 'api-call', label: 'API Call', desc: 'Triggered by an external API request' },
  { value: 'file-upload', label: 'File Upload', desc: 'Triggered when a file is received' },
  { value: 'email-received', label: 'Email Received', desc: 'Triggered by an inbound email' },
  { value: 'database-change', label: 'Database Change', desc: 'CDC / row insert or update' },
  { value: 'message-queue', label: 'Message Queue', desc: 'Kafka, SQS, RabbitMQ, Pub/Sub' },
  { value: 'manual', label: 'Manual / On-demand', desc: 'Triggered manually by a person' },
]

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'web-app', label: 'Web Application' },
  { value: 'backend-service', label: 'Backend Service / API' },
  { value: 'data-pipeline', label: 'Data Pipeline / ETL' },
  { value: 'api-integration', label: 'API Integration' },
  { value: 'n8n', label: 'n8n Workflow' },
  { value: 'zapier', label: 'Zapier' },
  { value: 'make', label: 'Make (Integromat)' },
  { value: 'python-script', label: 'Python Script' },
  { value: 'node-script', label: 'Node.js Script' },
  { value: 'supabase-edge-function', label: 'Supabase Edge Function' },
  { value: 'other', label: 'Other (specify below)' },
]

const STEP_TYPES: { value: StepType; label: string; color: string }[] = [
  { value: 'data-fetch', label: 'Fetch Data', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'transform', label: 'Transform', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'decision', label: 'Decision / Branch', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  { value: 'action', label: 'Action / Write', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'notification', label: 'Notification', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'storage', label: 'Storage / DB', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  { value: 'external-call', label: 'External API Call', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { value: 'loop', label: 'Loop / Iterator', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'wait', label: 'Wait / Delay', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300' },
]

const AUTH_METHODS: { value: AuthMethod; label: string }[] = [
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'jwt', label: 'JWT / Bearer Token' },
  { value: 'service-account', label: 'Service Account' },
  { value: 'none', label: 'No Auth Required' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

// ── Shared UI primitives ─────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 focus:border-[#6366f1] placeholder-gray-400 dark:placeholder-gray-500"
const textareaCls = inputCls + ' resize-none leading-relaxed'
const selectCls = inputCls

function SectionCard({ step, title, description, children }: {
  step: number; title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start gap-4">
        <span className="w-7 h-7 rounded-full bg-[#6366f1] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</span>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, mono, children }: {
  label: string; required?: boolean; hint?: string; mono?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className={`block mb-1.5 ${mono ? 'text-xs font-mono text-gray-500 dark:text-gray-400' : 'text-sm font-medium text-gray-700 dark:text-gray-300'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1.5 font-sans">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, label, description }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-[#6366f1]' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>}
      </div>
    </label>
  )
}

function StepTypeBadge({ type }: { type: StepType }) {
  const def = STEP_TYPES.find((s) => s.value === type)
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${def?.color ?? ''}`}>
      {def?.label ?? type}
    </span>
  )
}

// ── Markdown generator ───────────────────────────────────────────────────────

function buildCustomFieldsBlock(
  customFields: Record<string, string | boolean>,
  fieldConfigs: MAFieldConfig[],
  section: string,
): string {
  const sectionFields = fieldConfigs
    .filter((f) => f.exportSection === section && f.visible && f.exportFormat !== 'hidden')
    .sort((a, b) => a.order - b.order)

  if (sectionFields.length === 0) return ''

  const lines: string[] = []
  for (const fc of sectionFields) {
    const raw = customFields[fc.key]
    const val = raw === undefined || raw === '' ? null : raw
    if (val === null) continue
    const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)
    const label = fc.exportLabel || fc.label

    switch (fc.exportFormat) {
      case 'table-row':
        lines.push(`| ${label} | ${display} |`)
        break
      case 'heading-body':
        lines.push(`### ${label}\n${display}\n`)
        break
      case 'bullet':
        lines.push(`- **${label}:** ${display}`)
        break
      case 'code-block':
        lines.push(`### ${label}\n\`\`\`\n${display}\n\`\`\`\n`)
        break
      case 'inline':
        lines.push(`**${label}:** ${display}`)
        break
    }
  }
  return lines.join('\n')
}

function buildPRD(data: PRDBriefFormData, customFieldConfigs: MAFieldConfig[]): string {
  const now = new Date().toISOString()
  const platform = PLATFORM_OPTIONS.find((p) => p.value === data.platform)?.label ?? data.platform
  const trigger = TRIGGER_OPTIONS.find((t) => t.value === data.triggerType)?.label ?? data.triggerType

  const stepRows = data.steps.map((s, i) => {
    const type = STEP_TYPES.find((t) => t.value === s.type)?.label ?? s.type
    return [
      `#### Step ${i + 1}: ${s.name}`,
      `- **Type:** \`${type}\``,
      `- **Description:** ${s.description || '—'}`,
      s.inputs ? `- **Inputs:** ${s.inputs}` : '',
      s.outputs ? `- **Outputs:** ${s.outputs}` : '',
      s.errorHandling ? `- **Error Handling:** ${s.errorHandling}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const integrationRows = data.integrations.map((int, i) => [
    `#### ${i + 1}. ${int.systemName}`,
    `- **Purpose:** ${int.purpose || '—'}`,
    `- **Auth:** \`${int.authMethod}\``,
    int.apiDocs ? `- **Docs:** ${int.apiDocs}` : '',
    int.notes ? `- **Notes:** ${int.notes}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const acRows = data.acceptanceCriteria.map((ac, i) => [
    `#### Scenario ${i + 1}: ${ac.scenario}`,
    ac.given ? `- **Given:** ${ac.given}` : '',
    ac.when ? `- **When:** ${ac.when}` : '',
    ac.then ? `- **Then:** ${ac.then}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const riskRows = data.risks.map((r, i) => [
    `#### Risk ${i + 1}`,
    `- **Description:** ${r.description}`,
    `- **Likelihood:** ${r.likelihood}`,
    r.mitigation ? `- **Mitigation:** ${r.mitigation}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const cf = data.customFields ?? {}
  const customBlocks: Record<string, string> = {}
  const customSections = [
    'Overview',
    '1. Technical Context',
    '2. Trigger & Activation',
    '3. Workflow Design',
    '4. Integrations',
    '5. Data Requirements',
    '6. Non-Functional Requirements',
    '7. Acceptance Criteria',
    '8. Constraints, Assumptions & Risks',
    '9. Instructions for Claude Code',
  ]
  for (const sec of customSections) {
    const block = buildCustomFieldsBlock(cf, customFieldConfigs, sec)
    if (block) customBlocks[sec] = block
  }

  return [
    `---`,
    `schema: ninety-one-automation-prd-v1`,
    `project: "${data.projectName}"`,
    `code: "${data.projectCode}"`,
    `priority: ${data.priority}`,
    `platform: ${data.platform}`,
    `trigger: ${data.triggerType}`,
    `generated_at: "${now}"`,
    `target_date: "${data.targetDate}"`,
    `owner: "${data.owner}"`,
    `---`,
    ``,
    `# Automation PRD — ${data.projectName}`,
    data.projectCode ? `> **Project Code:** \`${data.projectCode}\` · **Priority:** ${data.priority.toUpperCase()} · **Owner:** ${data.owner}` : `> **Priority:** ${data.priority.toUpperCase()}${data.owner ? ` · **Owner:** ${data.owner}` : ''}`,
    ``,
    `## Overview`,
    ``,
    `**One-liner:** ${data.oneLiner}`,
    data.targetDate ? `**Target completion:** ${data.targetDate}` : '',
    ``,
    `### Problem Statement`,
    data.problemStatement || '_(not specified)_',
    ``,
    `### Desired Outcome`,
    data.desiredOutcome || '_(not specified)_',
    ``,
    data.outOfScope ? `### Out of Scope\n${data.outOfScope}\n` : '',
    data.successMetrics ? `### Success Metrics\n${data.successMetrics}\n` : '',
    customBlocks['Overview'] ?? '',
    `---`,
    ``,
    `## 1. Technical Context`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Platform | ${platform}${data.customPlatform ? ` — ${data.customPlatform}` : ''} |`,
    `| Hosting / Infrastructure | ${data.hosting} |`,
    data.currentTechStack ? `| Current Tech Stack | ${data.currentTechStack} |` : '',
    data.existingCodebase ? `| Existing Codebase | ${data.existingCodebase} |` : '',
    customBlocks['1. Technical Context'] ?? '',
    ``,
    data.relatedDocs ? `**Reference docs:** ${data.relatedDocs}\n` : '',
    `---`,
    ``,
    `## 2. Trigger & Activation`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| Trigger Type | **${trigger}** |`,
    data.schedule ? `| Schedule / Cron | \`${data.schedule}\` |` : '',
    data.estimatedVolume ? `| Estimated Volume | ${data.estimatedVolume} |` : '',
    data.estimatedFrequency ? `| Estimated Frequency | ${data.estimatedFrequency} |` : '',
    customBlocks['2. Trigger & Activation'] ?? '',
    ``,
    data.triggerDetails ? `**Trigger details:**\n${data.triggerDetails}\n` : '',
    `---`,
    ``,
    `## 3. Workflow Design`,
    ``,
    `> The following steps define the complete execution path. Implement them in order unless branching logic dictates otherwise.`,
    ``,
    stepRows || '_No steps defined._',
    customBlocks['3. Workflow Design'] ?? '',
    ``,
    `---`,
    ``,
    `## 4. Integrations`,
    ``,
    integrationRows || '_No integrations defined._',
    customBlocks['4. Integrations'] ?? '',
    ``,
    `---`,
    ``,
    `## 5. Data Requirements`,
    ``,
    `### Input Schema`,
    `\`\`\``,
    data.inputSchema || '(not specified)',
    `\`\`\``,
    ``,
    `### Output Schema`,
    `\`\`\``,
    data.outputSchema || '(not specified)',
    `\`\`\``,
    ``,
    data.transformationRules ? `### Transformation Rules\n${data.transformationRules}\n` : '',
    data.piiPresent ? `> ⚠️ **This workflow handles PII.** Ensure data is handled in compliance with applicable regulations.\n` : '',
    data.dataRetention ? `**Data retention policy:** ${data.dataRetention}\n` : '',
    customBlocks['5. Data Requirements'] ?? '',
    `---`,
    ``,
    `## 6. Non-Functional Requirements`,
    ``,
    data.performanceTargets ? `**Performance targets:** ${data.performanceTargets}\n` : '',
    data.securityRequirements ? `**Security requirements:** ${data.securityRequirements}\n` : '',
    data.complianceRequirements ? `**Compliance:** ${data.complianceRequirements}\n` : '',
    data.errorStrategy ? `**Error handling strategy:** ${data.errorStrategy}\n` : '',
    data.loggingRequirements ? `**Logging:** ${data.loggingRequirements}\n` : '',
    data.monitoringRequirements ? `**Monitoring / Alerting:** ${data.monitoringRequirements}\n` : '',
    customBlocks['6. Non-Functional Requirements'] ?? '',
    `---`,
    ``,
    `## 7. Acceptance Criteria`,
    ``,
    acRows || '_No acceptance criteria defined._',
    customBlocks['7. Acceptance Criteria'] ?? '',
    ``,
    `---`,
    ``,
    `## 8. Constraints, Assumptions & Risks`,
    ``,
    data.assumptions ? `### Assumptions\n${data.assumptions}\n` : '',
    data.constraints ? `### Constraints\n${data.constraints}\n` : '',
    riskRows ? `### Risks\n\n${riskRows}\n` : '',
    customBlocks['8. Constraints, Assumptions & Risks'] ?? '',
    `---`,
    ``,
    `## 9. Instructions for Claude Code`,
    ``,
    `> This section contains direct guidance for AI-assisted implementation. Follow these instructions carefully.`,
    ``,
    data.preferredApproach ? `### Preferred Approach\n${data.preferredApproach}\n` : '',
    data.claudeNotes ? `### Additional Notes\n${data.claudeNotes}\n` : '',
    data.referenceMaterials ? `### Reference Materials\n${data.referenceMaterials}` : '',
    customBlocks['9. Instructions for Claude Code'] ?? '',
  ].filter((l) => l !== '').join('\n')
}

// ── Main component ───────────────────────────────────────────────────────────

const SECTIONS = [
  { label: 'Project Identity' },
  { label: 'Problem & Goals' },
  { label: 'Technical Context' },
  { label: 'Trigger & Schedule' },
  { label: 'Workflow Steps' },
  { label: 'Integrations' },
  { label: 'Data Requirements' },
  { label: 'Non-Functional Req.' },
  { label: 'Acceptance Criteria' },
  { label: 'Constraints & Risks' },
  { label: 'Claude Code Notes' },
]

export function MarketingAutomationPlatform({ onClose }: { onClose: () => void }) {
  const [generatedPRD, setGeneratedPRD] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const fieldConfig = useMAFieldConfig()

  const { register, control, handleSubmit, watch, reset, setValue } = useForm<PRDBriefFormData>({
    defaultValues: {
      priority: 'medium',
      platform: 'web-app',
      hosting: 'unknown',
      triggerType: 'scheduled-cron',
      steps: [{ name: '', type: 'data-fetch', description: '', inputs: '', outputs: '', errorHandling: '' }],
      integrations: [],
      acceptanceCriteria: [{ scenario: '', given: '', when: '', then: '' }],
      risks: [],
      piiPresent: false,
      customFields: {},
    },
  })

  const {
    fields: stepFields, append: appendStep, remove: removeStep, move: moveStep,
  } = useFieldArray({ control, name: 'steps' })

  const {
    fields: integrationFields, append: appendIntegration, remove: removeIntegration,
  } = useFieldArray({ control, name: 'integrations' })

  const {
    fields: acFields, append: appendAC, remove: removeAC,
  } = useFieldArray({ control, name: 'acceptanceCriteria' })

  const {
    fields: riskFields, append: appendRisk, remove: removeRisk,
  } = useFieldArray({ control, name: 'risks' })

  const platform = watch('platform')
  const piiPresent = watch('piiPresent')
  const customFieldValues = watch('customFields') ?? {}

  function onSubmit(data: PRDBriefFormData) {
    const allCustomFields = fieldConfig.store.fields.filter((f) => !f.isBuiltIn)
    setGeneratedPRD(buildPRD(data, allCustomFields))
  }

  // ── Custom field renderer ──────────────────────────────────────────────────
  function renderCustomFields(sectionId: string) {
    if (DYNAMIC_LIST_SECTIONS.has(sectionId)) return null
    const fields = fieldConfig.getCustomFields(sectionId)
    if (fields.length === 0) return null

    return (
      <>
        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
        {fields.map((fc) => (
          <div key={fc.id}>
            <label className={`block mb-1.5 ${fc.monoFont ? 'text-xs font-mono text-gray-500 dark:text-gray-400' : 'text-sm font-medium text-gray-700 dark:text-gray-300'}`}>
              {fc.label}
              {fc.required && <span className="text-red-500 ml-0.5">*</span>}
              {fc.hint && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1.5 font-sans">{fc.hint}</span>}
            </label>
            {renderCustomFieldInput(fc)}
          </div>
        ))}
      </>
    )
  }

  function renderCustomFieldInput(fc: MAFieldConfig) {
    const val = (customFieldValues[fc.key] ?? fc.defaultValue ?? '') as string
    const boolVal = customFieldValues[fc.key] === true || customFieldValues[fc.key] === 'true'
    const setVal = (v: string | boolean) => setValue(`customFields.${fc.key}`, v)

    switch (fc.fieldType) {
      case 'textarea':
        return (
          <textarea
            rows={fc.rows}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={fc.placeholder}
            className={textareaCls + (fc.monoFont ? ' font-mono text-xs' : '')}
          />
        )
      case 'select':
        return (
          <select value={val} onChange={(e) => setVal(e.target.value)} className={selectCls}>
            {!fc.required && <option value="">— Select —</option>}
            {fc.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'toggle':
        return (
          <Toggle value={boolVal} onChange={(v) => setVal(v)}
            label={boolVal ? 'Yes' : 'No'} />
        )
      case 'date':
        return (
          <input type="date" value={val} onChange={(e) => setVal(e.target.value)} className={inputCls} />
        )
      case 'number':
        return (
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
            placeholder={fc.placeholder} className={inputCls} />
        )
      case 'multi-chips': {
        const selected = val ? val.split(',').map((s) => s.trim()).filter(Boolean) : []
        return (
          <div className="flex flex-wrap gap-2">
            {fc.options.map((o) => {
              const active = selected.includes(o.value)
              return (
                <button key={o.value} type="button"
                  onClick={() => {
                    const next = active
                      ? selected.filter((s) => s !== o.value)
                      : [...selected, o.value]
                    setVal(next.join(', '))
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#6366f1] text-white border-[#6366f1]'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#6366f1]/50'
                  }`}>
                  {o.label}
                </button>
              )
            })}
          </div>
        )
      }
      default:
        return (
          <input type="text" value={val} onChange={(e) => setVal(e.target.value)}
            placeholder={fc.placeholder}
            className={inputCls + (fc.monoFont ? ' font-mono' : '')} />
        )
    }
  }

  const handleCopy = useCallback(async () => {
    if (!generatedPRD) return
    await navigator.clipboard.writeText(generatedPRD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedPRD])

  const handleDownload = useCallback(() => {
    if (!generatedPRD) return
    const slug = (watch('projectName') || 'prd').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const blob = new Blob([generatedPRD], { type: 'text/markdown; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-prd.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [generatedPRD, watch])

  return (
    <div className="fixed inset-0 z-50 bg-[#f5f5ff] dark:bg-[#15152a] overflow-y-auto">
      {/* ── Nav ── */}
      <div className="sticky top-0 z-20 bg-[#4f46e5] px-6 h-14 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <img
            src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png"
            alt="Ninety One" className="h-5 w-auto"
          />
          <div className="pl-4 border-l border-white/20">
            <span className="text-white/90 text-xs tracking-[0.18em] uppercase font-semibold">Automation PRD Briefing</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {generatedPRD && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCopy}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${copied ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 text-white/80 hover:text-white hover:border-white/60'}`}>
                {copied ? '✓ Copied' : 'Copy PRD'}
              </button>
              <button type="button" onClick={handleDownload}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/30 text-white/80 hover:text-white hover:border-white/60 font-medium transition-colors">
                Download .md
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            title="Field settings"
            className="text-white/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button type="button" onClick={onClose}
            className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded border border-white/20 hover:border-white/40 transition-colors">
            ← Email Platform
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 flex gap-6">
        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 hidden lg:block">
          <nav className="sticky top-24 space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-semibold px-3 pb-2">Sections</p>
            {SECTIONS.map((s, i) => (
              <button key={s.label} type="button" onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                  activeSection === i
                    ? 'bg-[#4f46e5] text-white font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <span className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold shrink-0 ${
                  activeSection === i ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>{i + 1}</span>
                {s.label}
              </button>
            ))}
            {generatedPRD && (
              <div className="pt-4 px-3">
                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 mb-4" />
                <button type="button" onClick={handleCopy}
                  className={`w-full text-xs py-2 rounded-lg font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'}`}>
                  {copied ? '✓ Copied!' : 'Copy PRD'}
                </button>
              </div>
            )}
          </nav>
        </aside>

        {/* ── Main form ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile section scroller */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden mb-4">
            {SECTIONS.map((s, i) => (
              <button key={s.label} type="button" onClick={() => setActiveSection(i)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeSection === i
                    ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                {i + 1}. {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
            {/* ── 0: Project Identity ── */}
            {activeSection === 0 && (
              <SectionCard step={1} title="Project Identity" description="Identify and scope the automation project.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Project Name" required>
                    <input type="text" {...register('projectName', { required: true })}
                      placeholder="e.g. Pardot → Supabase Sync" className={inputCls} />
                  </Field>
                  <Field label="Project Code" hint="(optional)">
                    <input type="text" {...register('projectCode')}
                      placeholder="e.g. AUTO-042" className={inputCls} />
                  </Field>
                </div>
                <Field label="One-liner description" required hint="One sentence. Be precise.">
                  <input type="text" {...register('oneLiner', { required: true })}
                    placeholder="e.g. Sync new Pardot prospects into Supabase and trigger a welcome email sequence daily at 06:00 UTC" className={inputCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Priority">
                    <select {...register('priority')} className={selectCls}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    {watch('priority') && (
                      <div className="mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${PRIORITY_STYLES[watch('priority')]}`}>
                          {watch('priority')}
                        </span>
                      </div>
                    )}
                  </Field>
                  <Field label="Owner / Requester">
                    <input type="text" {...register('owner')} placeholder="e.g. Jane Smith" className={inputCls} />
                  </Field>
                  <Field label="Target Completion Date">
                    <input type="date" {...register('targetDate')} className={inputCls} />
                  </Field>
                </div>
                {renderCustomFields('s0')}
              </SectionCard>
            )}

            {/* ── 1: Problem & Goals ── */}
            {activeSection === 1 && (
              <SectionCard step={2} title="Problem & Goals" description="Define what problem this solves and what good looks like.">
                <Field label="Problem Statement" required hint="What is broken, missing, or inefficient today?">
                  <textarea {...register('problemStatement', { required: true })} rows={4} placeholder="Today, [X] happens manually / doesn't happen at all / takes too long because..." className={textareaCls} />
                </Field>
                <Field label="Desired Outcome" required hint="What does success look like once this automation is live?">
                  <textarea {...register('desiredOutcome', { required: true })} rows={4} placeholder="Once live, [X] will happen automatically when [trigger], resulting in [outcome]..." className={textareaCls} />
                </Field>
                <Field label="Out of Scope" hint="Be explicit about what this automation will NOT do.">
                  <textarea {...register('outOfScope')} rows={3} placeholder="This automation will not handle: billing updates, historical backfill, GDPR deletion requests..." className={textareaCls} />
                </Field>
                <Field label="Success Metrics" hint="How will we know this is working correctly?">
                  <textarea {...register('successMetrics')} rows={3} placeholder="• 100% of new Pardot prospects synced within 15 minutes&#10;• Zero duplicate records in Supabase&#10;• Alerting fires within 2 minutes of any failure" className={textareaCls} />
                </Field>
                {renderCustomFields('s1')}
              </SectionCard>
            )}

            {/* ── 2: Technical Context ── */}
            {activeSection === 2 && (
              <SectionCard step={3} title="Technical Context" description="Describe the environment this automation will run in.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Platform / Runtime" required>
                    <select {...register('platform', { required: true })} className={selectCls}>
                      {PLATFORM_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                  {platform === 'other' && (
                    <Field label="Specify platform">
                      <input type="text" {...register('customPlatform')} placeholder="e.g. AWS Lambda + Step Functions" className={inputCls} />
                    </Field>
                  )}
                  <Field label="Hosting / Infrastructure">
                    <select {...register('hosting')} className={selectCls}>
                      <option value="unknown">Unknown / TBD</option>
                      <option value="aws">AWS</option>
                      <option value="gcp">Google Cloud</option>
                      <option value="azure">Azure</option>
                      <option value="vercel">Vercel</option>
                      <option value="supabase">Supabase</option>
                      <option value="on-premise">On-Premise</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </Field>
                </div>
                <Field label="Current Tech Stack" hint="Languages, frameworks, databases already in use">
                  <textarea {...register('currentTechStack')} rows={2} placeholder="e.g. Node.js 20, TypeScript, Supabase (PostgreSQL), Redis, React 18" className={textareaCls} />
                </Field>
                <Field label="Existing Codebase" hint="Repo URL or file path this automation should live alongside">
                  <input type="text" {...register('existingCodebase')} placeholder="e.g. github.com/org/repo or /src/automations/" className={inputCls} />
                </Field>
                <Field label="Related Documentation / Links">
                  <textarea {...register('relatedDocs')} rows={2} placeholder="API docs, architecture diagrams, Notion pages, Confluence, Jira tickets..." className={textareaCls} />
                </Field>
                {renderCustomFields('s2')}
              </SectionCard>
            )}

            {/* ── 3: Trigger ── */}
            {activeSection === 3 && (
              <SectionCard step={4} title="Trigger & Schedule" description="How and when does this automation start?">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TRIGGER_OPTIONS.map((t) => (
                    <label key={t.value}
                      className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        watch('triggerType') === t.value
                          ? 'border-[#4f46e5] bg-[#4f46e5]/5 dark:bg-[#4f46e5]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                      <input type="radio" {...register('triggerType')} value={t.value} className="sr-only" />
                      <p className={`text-sm font-medium ${watch('triggerType') === t.value ? 'text-[#4f46e5]' : 'text-gray-700 dark:text-gray-300'}`}>{t.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{t.desc}</p>
                    </label>
                  ))}
                </div>
                <Field label="Trigger Details" hint="Provide the specific webhook URL, cron expression, event name, queue name, etc.">
                  <textarea {...register('triggerDetails')} rows={3}
                    placeholder={watch('triggerType') === 'scheduled-cron' ? 'e.g. 0 6 * * * (daily at 06:00 UTC)' : 'Describe the exact trigger condition and any payload structure...'}
                    className={textareaCls} />
                </Field>
                {watch('triggerType') === 'scheduled-cron' && (
                  <Field label="Cron Expression" mono>
                    <input type="text" {...register('schedule')} placeholder="0 6 * * *" className={inputCls + ' font-mono'} />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use <a href="https://crontab.guru" target="_blank" rel="noreferrer" className="text-[#4f46e5] hover:underline">crontab.guru</a> to validate</p>
                  </Field>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Estimated Volume" hint="Records / events per run">
                    <input type="text" {...register('estimatedVolume')} placeholder="e.g. ~500 records per run" className={inputCls} />
                  </Field>
                  <Field label="Estimated Frequency">
                    <input type="text" {...register('estimatedFrequency')} placeholder="e.g. Once daily, ~365 runs/year" className={inputCls} />
                  </Field>
                </div>
                {renderCustomFields('s3')}
              </SectionCard>
            )}

            {/* ── 4: Workflow Steps ── */}
            {activeSection === 4 && (
              <SectionCard step={5} title="Workflow Steps" description="Define every step in the automation from start to finish, in execution order.">
                <div className="space-y-4">
                  {stepFields.map((field, idx) => (
                    <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">#{idx + 1}</span>
                          <Controller name={`steps.${idx}.type`} control={control}
                            render={({ field: f }) => (
                              <select value={f.value} onChange={(e) => f.onChange(e.target.value as StepType)}
                                className="text-xs border-0 bg-transparent focus:outline-none font-medium text-gray-700 dark:text-gray-300">
                                {STEP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            )}
                          />
                          <StepTypeBadge type={watch(`steps.${idx}.type`)} />
                        </div>
                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button type="button" onClick={() => moveStep(idx, idx - 1)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">↑</button>
                          )}
                          {idx < stepFields.length - 1 && (
                            <button type="button" onClick={() => moveStep(idx, idx + 1)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">↓</button>
                          )}
                          {stepFields.length > 1 && (
                            <button type="button" onClick={() => removeStep(idx)}
                              className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Remove</button>
                          )}
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <input type="text" {...register(`steps.${idx}.name`)} placeholder="Step name (e.g. Fetch new prospects from Pardot API)" className={inputCls} />
                        <textarea {...register(`steps.${idx}.description`)} rows={2} placeholder="What does this step do? Include any conditions or decision logic." className={textareaCls} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">inputs</label>
                            <input type="text" {...register(`steps.${idx}.inputs`)} placeholder="e.g. Pardot API token, last_sync_timestamp" className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">outputs</label>
                            <input type="text" {...register(`steps.${idx}.outputs`)} placeholder="e.g. Array of ProspectRecord objects" className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">error_handling</label>
                          <input type="text" {...register(`steps.${idx}.errorHandling`)} placeholder="e.g. Retry 3× with exponential backoff; log to error table and continue" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button"
                  onClick={() => appendStep({ name: '', type: 'action', description: '', inputs: '', outputs: '', errorHandling: '' })}
                  className="mt-2 text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium transition-colors flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">+</span>
                  Add Step
                </button>
                {renderCustomFields('s4')}
              </SectionCard>
            )}

            {/* ── 5: Integrations ── */}
            {activeSection === 5 && (
              <SectionCard step={6} title="Integrations" description="List every external system this automation reads from or writes to.">
                {integrationFields.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">No integrations added yet.</p>
                )}
                <div className="space-y-4">
                  {integrationFields.map((field, idx) => (
                    <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">Integration {idx + 1}</p>
                        <button type="button" onClick={() => removeIntegration(idx)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">System Name</label>
                          <input type="text" {...register(`integrations.${idx}.systemName`)} placeholder="e.g. Pardot, Supabase, SendGrid" className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Auth Method</label>
                          <select {...register(`integrations.${idx}.authMethod`)} className={selectCls}>
                            {AUTH_METHODS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Purpose / What data is exchanged</label>
                        <input type="text" {...register(`integrations.${idx}.purpose`)} placeholder="e.g. Read new prospect records created in last 24h" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">API Docs URL</label>
                        <input type="url" {...register(`integrations.${idx}.apiDocs`)} placeholder="https://..." className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                        <input type="text" {...register(`integrations.${idx}.notes`)} placeholder="Rate limits, known quirks, env var names..." className={inputCls} />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button"
                  onClick={() => appendIntegration({ systemName: '', purpose: '', authMethod: 'api-key', apiDocs: '', notes: '' })}
                  className="mt-2 text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium transition-colors flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">+</span>
                  Add Integration
                </button>
                {renderCustomFields('s5')}
              </SectionCard>
            )}

            {/* ── 6: Data Requirements ── */}
            {activeSection === 6 && (
              <SectionCard step={7} title="Data Requirements" description="Define input/output schemas and transformation rules. The more precise, the better the implementation.">
                <Field label="Input Schema / Payload" mono hint="JSON, TypeScript interface, SQL schema, or plain description">
                  <textarea {...register('inputSchema')} rows={6} placeholder={`// Example TypeScript interface\ninterface PardotProspect {\n  id: number\n  email: string\n  created_at: string\n  custom_field_1: string | null\n}`} className={textareaCls + ' font-mono text-xs'} />
                </Field>
                <Field label="Output Schema / Payload" mono hint="What this automation produces">
                  <textarea {...register('outputSchema')} rows={6} placeholder={`// Example: row inserted into Supabase\ninterface ProspectRecord {\n  id: string // uuid\n  email: string\n  source: 'pardot'\n  synced_at: string // ISO timestamp\n}`} className={textareaCls + ' font-mono text-xs'} />
                </Field>
                <Field label="Transformation Rules" hint="Field mapping, type coercion, enrichment, deduplication logic">
                  <textarea {...register('transformationRules')} rows={4} placeholder="• Map pardot.id → external_id (string cast)&#10;• Normalise email to lowercase&#10;• Skip records where email contains '@test.'" className={textareaCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Data Retention Policy">
                    <input type="text" {...register('dataRetention')} placeholder="e.g. Raw payloads deleted after 30 days" className={inputCls} />
                  </Field>
                  <div className="flex items-end">
                    <Controller name="piiPresent" control={control}
                      render={({ field }) => (
                        <Toggle value={field.value} onChange={field.onChange}
                          label="Contains PII / sensitive data"
                          description="Email addresses, names, financial data, etc." />
                      )}
                    />
                  </div>
                </div>
                {piiPresent && (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      PII flag set. Ensure data handling complies with GDPR/POPIA, all PII is encrypted at rest and in transit, and data is not logged in plain text.
                    </p>
                  </div>
                )}
                {renderCustomFields('s6')}
              </SectionCard>
            )}

            {/* ── 7: Non-Functional Requirements ── */}
            {activeSection === 7 && (
              <SectionCard step={8} title="Non-Functional Requirements" description="Constraints the implementation must satisfy beyond feature correctness.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Performance Targets">
                    <input type="text" {...register('performanceTargets')} placeholder="e.g. Complete full run in < 5 minutes" className={inputCls} />
                  </Field>
                  <Field label="Error Handling Strategy">
                    <input type="text" {...register('errorStrategy')} placeholder="e.g. Dead-letter queue + Slack alert on 3 failures" className={inputCls} />
                  </Field>
                </div>
                <Field label="Security Requirements">
                  <textarea {...register('securityRequirements')} rows={2} placeholder="e.g. Secrets via environment variables only — never hardcoded; use service accounts with least-privilege" className={textareaCls} />
                </Field>
                <Field label="Compliance Requirements">
                  <textarea {...register('complianceRequirements')} rows={2} placeholder="e.g. GDPR — right to erasure must be propagated; POPIA — SA resident data stays in eu-west-1" className={textareaCls} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Logging Requirements">
                    <textarea {...register('loggingRequirements')} rows={2} placeholder="e.g. Log run start, record count, any errors to automation_runs table" className={textareaCls} />
                  </Field>
                  <Field label="Monitoring & Alerting">
                    <textarea {...register('monitoringRequirements')} rows={2} placeholder="e.g. Slack #ops-alerts on any failure; PagerDuty if 3 consecutive failures" className={textareaCls} />
                  </Field>
                </div>
                {renderCustomFields('s7')}
              </SectionCard>
            )}

            {/* ── 8: Acceptance Criteria ── */}
            {activeSection === 8 && (
              <SectionCard step={9} title="Acceptance Criteria" description="Define exactly what must be true for this automation to be considered complete. Written in Given-When-Then format for testability.">
                <div className="space-y-4">
                  {acFields.map((field, idx) => (
                    <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">Scenario {idx + 1}</p>
                        {acFields.length > 1 && (
                          <button type="button" onClick={() => removeAC(idx)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                        )}
                      </div>
                      <input type="text" {...register(`acceptanceCriteria.${idx}.scenario`)} placeholder="Scenario name (e.g. New prospect is synced correctly)" className={inputCls} />
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <span className="text-xs font-mono font-bold text-green-600 dark:text-green-400 w-12 shrink-0 mt-2">Given</span>
                          <input type="text" {...register(`acceptanceCriteria.${idx}.given`)} placeholder="the system is in state X..." className={inputCls} />
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 w-12 shrink-0 mt-2">When</span>
                          <input type="text" {...register(`acceptanceCriteria.${idx}.when`)} placeholder="the trigger fires with payload Y..." className={inputCls} />
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 w-12 shrink-0 mt-2">Then</span>
                          <input type="text" {...register(`acceptanceCriteria.${idx}.then`)} placeholder="record Z is inserted in database W within N seconds" className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button"
                  onClick={() => appendAC({ scenario: '', given: '', when: '', then: '' })}
                  className="mt-2 text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium transition-colors flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">+</span>
                  Add Scenario
                </button>
                {renderCustomFields('s8')}
              </SectionCard>
            )}

            {/* ── 9: Constraints & Risks ── */}
            {activeSection === 9 && (
              <SectionCard step={10} title="Constraints & Risks" description="Document what you know and what could go wrong.">
                <Field label="Assumptions" hint="Things you believe to be true but haven't verified">
                  <textarea {...register('assumptions')} rows={3} placeholder="• Pardot API v5 is available and credentials are already provisioned&#10;• Supabase project is on Pro plan (row limits not a concern)&#10;• Email volumes will not exceed 10,000/day" className={textareaCls} />
                </Field>
                <Field label="Constraints" hint="Hard limits that cannot be changed">
                  <textarea {...register('constraints')} rows={3} placeholder="• Must use existing Supabase project (cannot create new)&#10;• Pardot API rate limit: 25,000 calls/day&#10;• No new third-party SaaS subscriptions allowed" className={textareaCls} />
                </Field>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Risks</p>
                  <div className="space-y-3">
                    {riskFields.map((field, idx) => (
                      <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400">Risk {idx + 1}</p>
                          <button type="button" onClick={() => removeRisk(idx)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <input type="text" {...register(`risks.${idx}.description`)} placeholder="Risk description" className={inputCls} />
                          </div>
                          <select {...register(`risks.${idx}.likelihood`)} className={selectCls}>
                            <option value="low">Low likelihood</option>
                            <option value="medium">Medium likelihood</option>
                            <option value="high">High likelihood</option>
                          </select>
                        </div>
                        <input type="text" {...register(`risks.${idx}.mitigation`)} placeholder="Mitigation strategy" className={inputCls} />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => appendRisk({ description: '', likelihood: 'medium', mitigation: '' })}
                    className="mt-2 text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium transition-colors flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">+</span>
                    Add Risk
                  </button>
                </div>
                {renderCustomFields('s9')}
              </SectionCard>
            )}

            {/* ── 10: Claude Code Notes ── */}
            {activeSection === 10 && (
              <SectionCard step={11} title="Instructions for Claude Code" description="Direct guidance that will be embedded verbatim into the PRD for Claude Code to follow.">
                <Field label="Preferred Approach / Architecture" hint="Tell Claude Code how you want this built">
                  <textarea {...register('preferredApproach')} rows={5}
                    placeholder="e.g. Implement as a TypeScript Supabase Edge Function. Use async/await throughout. Prefer functional composition over OOP. Use zod for all schema validation at the boundaries. Do not use any ORMs — raw SQL via supabase-js is preferred." className={textareaCls} />
                </Field>
                <Field label="Additional Notes for Claude Code" hint="Anything else Claude should know before writing the first line of code">
                  <textarea {...register('claudeNotes')} rows={4}
                    placeholder="e.g. The Pardot API wrapper already exists in src/lib/pardot.ts — reuse it. The Supabase client is exported from src/lib/supabase.ts. Secrets are in .env.local." className={textareaCls} />
                </Field>
                <Field label="Reference Materials" hint="URLs, file paths, snippets Claude should read before starting">
                  <textarea {...register('referenceMaterials')} rows={3}
                    placeholder="src/lib/pardot.ts&#10;src/lib/supabase.ts&#10;https://developer.salesforce.com/docs/marketing/pardot/guide/prospects-v5" className={textareaCls} />
                </Field>
                {renderCustomFields('s10')}
                <div className="pt-4 flex gap-3">
                  <button type="submit"
                    className="px-6 py-2.5 bg-[#4f46e5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338ca] transition-colors shadow-sm">
                    Generate PRD
                  </button>
                  <button type="button" onClick={() => { reset(); setGeneratedPRD(null); setActiveSection(0) }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors">
                    Reset
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Section navigation */}
            <div className="flex justify-between pt-4">
              {activeSection > 0 && (
                <button type="button" onClick={() => setActiveSection(activeSection - 1)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  ← Previous
                </button>
              )}
              {activeSection < SECTIONS.length - 1 && (
                <button type="button" onClick={() => setActiveSection(activeSection + 1)}
                  className="ml-auto px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors">
                  Next →
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Output panel ── */}
        {generatedPRD && (
          <aside className="w-[420px] shrink-0 hidden xl:block">
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Generated PRD</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCopy}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                      copied ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                    }`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={handleDownload}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors font-medium">
                    .md
                  </button>
                </div>
              </div>
              <pre className="text-[10.5px] leading-relaxed bg-[#0d1117] text-[#e6edf3] rounded-xl p-4 overflow-auto max-h-[calc(100vh-200px)] whitespace-pre-wrap font-mono border border-gray-800 shadow-inner">
                {generatedPRD}
              </pre>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile output drawer */}
      {generatedPRD && (
        <div className="xl:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">PRD ready</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleCopy}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-[#4f46e5] text-white hover:bg-[#4338ca]'}`}>
                {copied ? '✓ Copied' : 'Copy PRD'}
              </button>
              <button type="button" onClick={handleDownload}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Download .md
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Field settings panel ── */}
      {showSettings && (
        <MAFieldSettingsPanel
          config={fieldConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
