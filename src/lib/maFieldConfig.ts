// ── Types ─────────────────────────────────────────────────────────────────────

export type MAFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'toggle'
  | 'date'
  | 'number'
  | 'radio-cards'    // special — rendered as visual card grid
  | 'multi-chips'    // multi-select pill group

export type MAExportFormat =
  | 'table-row'    // | Label | Value |
  | 'heading-body' // ### Label\nValue
  | 'bullet'       // - **Label:** Value
  | 'code-block'   // ```\nValue\n```
  | 'inline'       // **Label:** Value (inline in parent section)
  | 'hidden'       // excluded from export

export interface MAFieldOption {
  value: string
  label: string
  description?: string // used by radio-cards
}

export interface MAFieldConfig {
  id: string
  sectionId: string
  key: string           // unique form key — built-in keys match PRDBriefFormData props
  label: string
  fieldType: MAFieldType
  required: boolean
  placeholder: string
  hint: string
  rows: number          // textarea rows
  monoFont: boolean     // monospace input
  options: MAFieldOption[]
  defaultValue: string
  visible: boolean
  order: number
  isBuiltIn: boolean    // built-in fields: label/hint/visible/export editable; type/key/delete locked
  exportLabel: string   // heading/key in PRD output (defaults to label)
  exportFormat: MAExportFormat
  exportSection: string // which PRD H2 section this field maps to
}

export interface MASectionConfig {
  id: string
  title: string
  description: string
  stepNumber: number
  visible: boolean
  order: number
}

export interface MAFieldConfigStore {
  sections: MASectionConfig[]
  fields: MAFieldConfig[]
}

// ── Default section definitions ───────────────────────────────────────────────

export const DEFAULT_SECTIONS: MASectionConfig[] = [
  { id: 's0', stepNumber: 1,  title: 'Project Identity',           description: 'Identify and scope the automation project.',                                          visible: true, order: 0 },
  { id: 's1', stepNumber: 2,  title: 'Problem & Goals',            description: 'Define what problem this solves and what good looks like.',                           visible: true, order: 1 },
  { id: 's2', stepNumber: 3,  title: 'Technical Context',          description: 'Describe the environment this automation will run in.',                               visible: true, order: 2 },
  { id: 's3', stepNumber: 4,  title: 'Trigger & Schedule',         description: 'How and when does this automation start?',                                            visible: true, order: 3 },
  { id: 's4', stepNumber: 5,  title: 'Workflow Steps',             description: 'Define every step in the automation from start to finish, in execution order.',       visible: true, order: 4 },
  { id: 's5', stepNumber: 6,  title: 'Integrations',               description: 'List every external system this automation reads from or writes to.',                 visible: true, order: 5 },
  { id: 's6', stepNumber: 7,  title: 'Data Requirements',          description: 'Define input/output schemas and transformation rules.',                               visible: true, order: 6 },
  { id: 's7', stepNumber: 8,  title: 'Non-Functional Requirements', description: 'Constraints the implementation must satisfy beyond feature correctness.',            visible: true, order: 7 },
  { id: 's8', stepNumber: 9,  title: 'Acceptance Criteria',        description: 'Define exactly what must be true for this to be considered complete.',                visible: true, order: 8 },
  { id: 's9', stepNumber: 10, title: 'Constraints & Risks',        description: 'Document what you know and what could go wrong.',                                     visible: true, order: 9 },
  { id: 's10', stepNumber: 11, title: 'Instructions for Claude Code', description: 'Direct guidance embedded verbatim into the PRD for Claude Code to follow.',       visible: true, order: 10 },
]

// ── Default built-in fields ───────────────────────────────────────────────────
// key matches the PRDBriefFormData property name (or path)

export const DEFAULT_FIELDS: MAFieldConfig[] = [
  // ── Section 0: Project Identity ─────────────────────────────────────────────
  { id: 'f-projectName',     sectionId: 's0', key: 'projectName',     label: 'Project Name',          fieldType: 'text',     required: true,  placeholder: 'e.g. Pardot → Supabase Sync',                hint: '',              rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Project',    exportFormat: 'table-row',   exportSection: 'Overview' },
  { id: 'f-projectCode',     sectionId: 's0', key: 'projectCode',     label: 'Project Code',          fieldType: 'text',     required: false, placeholder: 'e.g. AUTO-042',                             hint: '(optional)',    rows: 1, monoFont: true,  options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Code',       exportFormat: 'table-row',   exportSection: 'Overview' },
  { id: 'f-oneLiner',        sectionId: 's0', key: 'oneLiner',        label: 'One-liner description', fieldType: 'text',     required: true,  placeholder: 'One sentence. Be precise.',                  hint: 'One sentence',  rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'One-liner',  exportFormat: 'inline',      exportSection: 'Overview' },
  { id: 'f-priority',        sectionId: 's0', key: 'priority',        label: 'Priority',              fieldType: 'select',   required: false, placeholder: '',                                          hint: '',              rows: 1, monoFont: false, options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }], defaultValue: 'medium', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Priority', exportFormat: 'table-row', exportSection: 'Overview' },
  { id: 'f-owner',           sectionId: 's0', key: 'owner',           label: 'Owner / Requester',     fieldType: 'text',     required: false, placeholder: 'e.g. Jane Smith',                           hint: '',              rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 4, isBuiltIn: true, exportLabel: 'Owner',      exportFormat: 'table-row',   exportSection: 'Overview' },
  { id: 'f-targetDate',      sectionId: 's0', key: 'targetDate',      label: 'Target Completion Date',fieldType: 'date',     required: false, placeholder: '',                                          hint: '',              rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 5, isBuiltIn: true, exportLabel: 'Target Date', exportFormat: 'table-row',  exportSection: 'Overview' },

  // ── Section 1: Problem & Goals ───────────────────────────────────────────────
  { id: 'f-problemStatement',sectionId: 's1', key: 'problemStatement',label: 'Problem Statement',     fieldType: 'textarea', required: true,  placeholder: 'Today, [X] happens manually / doesn\'t happen at all...',  hint: 'What is broken, missing, or inefficient today?', rows: 4, monoFont: false, options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Problem Statement', exportFormat: 'heading-body', exportSection: 'Overview' },
  { id: 'f-desiredOutcome',  sectionId: 's1', key: 'desiredOutcome',  label: 'Desired Outcome',       fieldType: 'textarea', required: true,  placeholder: 'Once live, [X] will happen automatically...',              hint: 'What does success look like once this is live?', rows: 4, monoFont: false, options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Desired Outcome', exportFormat: 'heading-body', exportSection: 'Overview' },
  { id: 'f-outOfScope',      sectionId: 's1', key: 'outOfScope',      label: 'Out of Scope',          fieldType: 'textarea', required: false, placeholder: 'This automation will not handle...',                        hint: 'Be explicit about what this will NOT do',        rows: 3, monoFont: false, options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Out of Scope', exportFormat: 'heading-body',  exportSection: 'Overview' },
  { id: 'f-successMetrics',  sectionId: 's1', key: 'successMetrics',  label: 'Success Metrics',       fieldType: 'textarea', required: false, placeholder: '• 100% of records synced within 15 minutes...',             hint: 'How will we know this is working correctly?',    rows: 3, monoFont: false, options: [], defaultValue: '', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Success Metrics', exportFormat: 'heading-body', exportSection: 'Overview' },

  // ── Section 2: Technical Context ────────────────────────────────────────────
  { id: 'f-platform',        sectionId: 's2', key: 'platform',        label: 'Platform / Runtime',    fieldType: 'select',   required: true,  placeholder: '',  hint: '', rows: 1, monoFont: false, options: [ { value: 'web-app', label: 'Web Application' }, { value: 'backend-service', label: 'Backend Service / API' }, { value: 'data-pipeline', label: 'Data Pipeline / ETL' }, { value: 'api-integration', label: 'API Integration' }, { value: 'n8n', label: 'n8n Workflow' }, { value: 'zapier', label: 'Zapier' }, { value: 'make', label: 'Make (Integromat)' }, { value: 'python-script', label: 'Python Script' }, { value: 'node-script', label: 'Node.js Script' }, { value: 'supabase-edge-function', label: 'Supabase Edge Function' }, { value: 'other', label: 'Other' } ], defaultValue: 'web-app', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Platform', exportFormat: 'table-row', exportSection: '1. Technical Context' },
  { id: 'f-hosting',         sectionId: 's2', key: 'hosting',         label: 'Hosting / Infrastructure', fieldType: 'select', required: false, placeholder: '', hint: '', rows: 1, monoFont: false, options: [ { value: 'unknown', label: 'Unknown / TBD' }, { value: 'aws', label: 'AWS' }, { value: 'gcp', label: 'Google Cloud' }, { value: 'azure', label: 'Azure' }, { value: 'vercel', label: 'Vercel' }, { value: 'supabase', label: 'Supabase' }, { value: 'on-premise', label: 'On-Premise' }, { value: 'mixed', label: 'Mixed' } ], defaultValue: 'unknown', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Hosting', exportFormat: 'table-row', exportSection: '1. Technical Context' },
  { id: 'f-currentTechStack',sectionId: 's2', key: 'currentTechStack',label: 'Current Tech Stack',    fieldType: 'textarea', required: false, placeholder: 'e.g. Node.js 20, TypeScript, Supabase (PostgreSQL), Redis', hint: 'Languages, frameworks, databases already in use', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Tech Stack', exportFormat: 'table-row', exportSection: '1. Technical Context' },
  { id: 'f-existingCodebase',sectionId: 's2', key: 'existingCodebase',label: 'Existing Codebase',     fieldType: 'text',     required: false, placeholder: 'e.g. github.com/org/repo or /src/automations/',             hint: 'Repo URL or file path',                          rows: 1, monoFont: true,  options: [], defaultValue: '', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Codebase', exportFormat: 'table-row', exportSection: '1. Technical Context' },
  { id: 'f-relatedDocs',     sectionId: 's2', key: 'relatedDocs',     label: 'Related Documentation', fieldType: 'textarea', required: false, placeholder: 'API docs, architecture diagrams, Notion pages, Jira tickets...', hint: '', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 4, isBuiltIn: true, exportLabel: 'Reference Docs', exportFormat: 'bullet', exportSection: '1. Technical Context' },

  // ── Section 3: Trigger & Schedule ───────────────────────────────────────────
  { id: 'f-triggerType',     sectionId: 's3', key: 'triggerType',     label: 'Trigger Type',          fieldType: 'radio-cards', required: true, placeholder: '', hint: '', rows: 1, monoFont: false, options: [ { value: 'scheduled-cron', label: 'Scheduled / Cron', description: 'Runs at a fixed interval' }, { value: 'webhook-event', label: 'Webhook / Event', description: 'Triggered by an incoming HTTP call' }, { value: 'user-action', label: 'User Action', description: 'Triggered by a user in the UI' }, { value: 'api-call', label: 'API Call', description: 'Triggered by an external API request' }, { value: 'file-upload', label: 'File Upload', description: 'Triggered when a file is received' }, { value: 'email-received', label: 'Email Received', description: 'Triggered by an inbound email' }, { value: 'database-change', label: 'Database Change', description: 'CDC / row insert or update' }, { value: 'message-queue', label: 'Message Queue', description: 'Kafka, SQS, RabbitMQ, Pub/Sub' }, { value: 'manual', label: 'Manual / On-demand', description: 'Triggered manually by a person' } ], defaultValue: 'scheduled-cron', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Trigger Type', exportFormat: 'table-row', exportSection: '2. Trigger & Activation' },
  { id: 'f-triggerDetails',  sectionId: 's3', key: 'triggerDetails',  label: 'Trigger Details',       fieldType: 'textarea', required: false, placeholder: 'Webhook URL, cron expression, event name, queue name...', hint: 'Specific condition and any payload structure', rows: 3, monoFont: false, options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Trigger Details', exportFormat: 'heading-body', exportSection: '2. Trigger & Activation' },
  { id: 'f-schedule',        sectionId: 's3', key: 'schedule',        label: 'Cron Expression',       fieldType: 'text',     required: false, placeholder: '0 6 * * *',                                              hint: '',                                                rows: 1, monoFont: true,  options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Schedule', exportFormat: 'table-row', exportSection: '2. Trigger & Activation' },
  { id: 'f-estimatedVolume', sectionId: 's3', key: 'estimatedVolume', label: 'Estimated Volume',      fieldType: 'text',     required: false, placeholder: 'e.g. ~500 records per run',                               hint: 'Records / events per run',                        rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Estimated Volume', exportFormat: 'table-row', exportSection: '2. Trigger & Activation' },
  { id: 'f-estimatedFreq',   sectionId: 's3', key: 'estimatedFrequency', label: 'Estimated Frequency', fieldType: 'text',   required: false, placeholder: 'e.g. Once daily, ~365 runs/year',                         hint: '',                                                rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 4, isBuiltIn: true, exportLabel: 'Estimated Frequency', exportFormat: 'table-row', exportSection: '2. Trigger & Activation' },

  // ── Section 6: Data Requirements ────────────────────────────────────────────
  { id: 'f-inputSchema',     sectionId: 's6', key: 'inputSchema',     label: 'Input Schema / Payload', fieldType: 'textarea', required: false, placeholder: '// TypeScript interface or JSON schema...', hint: 'JSON, TypeScript interface, SQL schema, or description', rows: 6, monoFont: true,  options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Input Schema', exportFormat: 'code-block', exportSection: '5. Data Requirements' },
  { id: 'f-outputSchema',    sectionId: 's6', key: 'outputSchema',    label: 'Output Schema / Payload', fieldType: 'textarea', required: false, placeholder: '// What this automation produces...', hint: 'What this automation produces', rows: 6, monoFont: true,  options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Output Schema', exportFormat: 'code-block', exportSection: '5. Data Requirements' },
  { id: 'f-transformRules',  sectionId: 's6', key: 'transformationRules', label: 'Transformation Rules', fieldType: 'textarea', required: false, placeholder: '• Map pardot.id → external_id (string cast)...', hint: 'Field mapping, type coercion, deduplication logic', rows: 4, monoFont: false, options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Transformation Rules', exportFormat: 'heading-body', exportSection: '5. Data Requirements' },
  { id: 'f-dataRetention',   sectionId: 's6', key: 'dataRetention',   label: 'Data Retention Policy', fieldType: 'text',     required: false, placeholder: 'e.g. Raw payloads deleted after 30 days', hint: '', rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Data Retention', exportFormat: 'bullet', exportSection: '5. Data Requirements' },
  { id: 'f-piiPresent',      sectionId: 's6', key: 'piiPresent',      label: 'Contains PII / sensitive data', fieldType: 'toggle', required: false, placeholder: '', hint: 'Email addresses, names, financial data, etc.', rows: 1, monoFont: false, options: [], defaultValue: 'false', visible: true, order: 4, isBuiltIn: true, exportLabel: 'PII Present', exportFormat: 'table-row', exportSection: '5. Data Requirements' },

  // ── Section 7: Non-Functional ────────────────────────────────────────────────
  { id: 'f-perfTargets',     sectionId: 's7', key: 'performanceTargets', label: 'Performance Targets', fieldType: 'text',    required: false, placeholder: 'e.g. Complete full run in < 5 minutes', hint: '', rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Performance Targets', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },
  { id: 'f-errorStrategy',   sectionId: 's7', key: 'errorStrategy',   label: 'Error Handling Strategy', fieldType: 'text',   required: false, placeholder: 'e.g. Dead-letter queue + Slack alert on 3 failures', hint: '', rows: 1, monoFont: false, options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Error Strategy', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },
  { id: 'f-securityReqs',    sectionId: 's7', key: 'securityRequirements', label: 'Security Requirements', fieldType: 'textarea', required: false, placeholder: 'e.g. Secrets via environment variables only...', hint: '', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Security', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },
  { id: 'f-complianceReqs',  sectionId: 's7', key: 'complianceRequirements', label: 'Compliance Requirements', fieldType: 'textarea', required: false, placeholder: 'e.g. GDPR — right to erasure must be propagated...', hint: '', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 3, isBuiltIn: true, exportLabel: 'Compliance', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },
  { id: 'f-loggingReqs',     sectionId: 's7', key: 'loggingRequirements', label: 'Logging Requirements', fieldType: 'textarea', required: false, placeholder: 'e.g. Log run start, record count, any errors to automation_runs table', hint: '', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 4, isBuiltIn: true, exportLabel: 'Logging', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },
  { id: 'f-monitoringReqs',  sectionId: 's7', key: 'monitoringRequirements', label: 'Monitoring & Alerting', fieldType: 'textarea', required: false, placeholder: 'e.g. Slack #ops-alerts on any failure...', hint: '', rows: 2, monoFont: false, options: [], defaultValue: '', visible: true, order: 5, isBuiltIn: true, exportLabel: 'Monitoring', exportFormat: 'bullet', exportSection: '6. Non-Functional Requirements' },

  // ── Section 9: Constraints & Risks ──────────────────────────────────────────
  { id: 'f-assumptions',     sectionId: 's9', key: 'assumptions',     label: 'Assumptions',           fieldType: 'textarea', required: false, placeholder: '• Pardot API v5 is available and credentials are provisioned...', hint: 'Things you believe to be true but haven\'t verified', rows: 3, monoFont: false, options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Assumptions', exportFormat: 'heading-body', exportSection: '8. Constraints, Assumptions & Risks' },
  { id: 'f-constraints',     sectionId: 's9', key: 'constraints',     label: 'Constraints',           fieldType: 'textarea', required: false, placeholder: '• Must use existing Supabase project...', hint: 'Hard limits that cannot be changed', rows: 3, monoFont: false, options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Constraints', exportFormat: 'heading-body', exportSection: '8. Constraints, Assumptions & Risks' },

  // ── Section 10: Claude Code Notes ───────────────────────────────────────────
  { id: 'f-preferredApproach',sectionId: 's10', key: 'preferredApproach', label: 'Preferred Approach / Architecture', fieldType: 'textarea', required: false, placeholder: 'e.g. Implement as a TypeScript Supabase Edge Function. Use async/await throughout...', hint: 'Tell Claude Code how you want this built', rows: 5, monoFont: false, options: [], defaultValue: '', visible: true, order: 0, isBuiltIn: true, exportLabel: 'Preferred Approach', exportFormat: 'heading-body', exportSection: '9. Instructions for Claude Code' },
  { id: 'f-claudeNotes',     sectionId: 's10', key: 'claudeNotes',     label: 'Additional Notes for Claude Code', fieldType: 'textarea', required: false, placeholder: 'e.g. The Pardot API wrapper already exists in src/lib/pardot.ts — reuse it...', hint: 'Anything else Claude should know before writing the first line of code', rows: 4, monoFont: false, options: [], defaultValue: '', visible: true, order: 1, isBuiltIn: true, exportLabel: 'Additional Notes', exportFormat: 'heading-body', exportSection: '9. Instructions for Claude Code' },
  { id: 'f-refMaterials',    sectionId: 's10', key: 'referenceMaterials', label: 'Reference Materials', fieldType: 'textarea', required: false, placeholder: 'src/lib/pardot.ts\nsrc/lib/supabase.ts\nhttps://...', hint: 'URLs, file paths, snippets Claude should read before starting', rows: 3, monoFont: true,  options: [], defaultValue: '', visible: true, order: 2, isBuiltIn: true, exportLabel: 'Reference Materials', exportFormat: 'heading-body', exportSection: '9. Instructions for Claude Code' },
]

export const EXPORT_FORMATS: { value: MAExportFormat; label: string; example: string }[] = [
  { value: 'table-row',   label: 'Table Row',      example: '| Label | Value |' },
  { value: 'heading-body',label: 'Heading + Body', example: '### Label\nValue' },
  { value: 'bullet',      label: 'Bullet Point',   example: '- **Label:** Value' },
  { value: 'code-block',  label: 'Code Block',     example: '```\nValue\n```' },
  { value: 'inline',      label: 'Inline',         example: '**Label:** Value' },
  { value: 'hidden',      label: 'Hidden',         example: '(not exported)' },
]

export const FIELD_TYPES: { value: MAFieldType; label: string; icon: string }[] = [
  { value: 'text',        label: 'Single-line Text', icon: 'T' },
  { value: 'textarea',    label: 'Multi-line Text',  icon: '¶' },
  { value: 'select',      label: 'Dropdown Select',  icon: '▾' },
  { value: 'toggle',      label: 'Toggle / Boolean', icon: '⊙' },
  { value: 'date',        label: 'Date Picker',      icon: '📅' },
  { value: 'number',      label: 'Number',           icon: '#' },
  { value: 'multi-chips', label: 'Multi-select Chips', icon: '⬤' },
]

// Sections with special built-in dynamic list renderers (steps, integrations, AC, risks)
// These sections will still allow custom fields to be added alongside them
export const DYNAMIC_LIST_SECTIONS = new Set(['s4', 's5', 's8'])

export const LS_KEY = 'ni-ma-field-config-v1'
