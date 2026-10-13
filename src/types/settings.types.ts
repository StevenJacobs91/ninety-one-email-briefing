// ─── Settings Types ─────────────────────────────────────────

export interface BrandThemeConfig {
  id: string
  label: string
  primary: string
  tint01?: string         // primary + 10% brightness
  tint02?: string         // primary − 5% brightness
  tint03?: string         // primary − 20% brightness
  accent: string
  logoUrl?: string        // Header logo image URL (120×60 px)
  stripeUrl?: string      // Decorative stripe image URL (200×234 px)
  footerLogoUrl?: string  // Footer logo image URL (120×130 px)
  /** Default body text colour for this theme — cream on dark backgrounds, charcoal on light */
  defaultTextColour?: '#e8e5ce' | '#424242'
}

export interface HtmlTemplateConfig {
  themeId: string
  filename: string
}

export interface HtmlModuleConfig {
  id: string
  label: string
  description: string
  category: ModuleCategory
  enabled: boolean
}

export type ModuleCategory =
  | 'Headers'
  | 'Content'
  | 'CTAs'
  | 'Events'
  | 'Speakers'
  | 'Articles'
  | 'Media'
  | 'Navigation'
  | 'Footers'

export interface FormFieldConfig {
  id: string
  label: string
  stepIndex: number
  required: boolean
  visible: boolean
  order: number
}

export interface FormStepConfig {
  id: string
  label: string
  order: number
  visible: boolean
}

export type AIGuardianMode = 'off' | 'optional' | 'pre-submission' | 'post-submission'
export type AIGuardianModel = 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'claude-opus-4-20250514'

export interface AIGuardianConfig {
  mode: AIGuardianMode
  model: AIGuardianModel
  supabaseUrl: string        // Supabase project URL (e.g. https://xxx.supabase.co)
  supabaseAnonKey: string    // Supabase anon/public key
  customSystemPrompt: string // Additional brand-specific instructions appended to the base prompt
}

export interface BrandGuardianConfig {
  minimumScore: number
  subjectLineMaxLength: number
  subjectLineMobileOptimal: number
  previewTextMinLength: number
  bodyIntroMaxLength: number
  headlineWarnLength: number
  sectionBodyWarnLength: number
  ctaLabelMaxLength: number
  maxExclamationMarks: number
  requireNinetyOneDomain: boolean
  spamTriggerWords: string[]
  brandNameVariants: string[]
  minDaysBetweenApprovalAndSend: number
  enableAccessibilityChecks: boolean
  enableComplianceChecks: boolean
  enableBrandVoiceChecks: boolean
  enableContentStructureChecks: boolean
  enableAudienceAlignmentChecks: boolean
  enableBrandProtectionChecks: boolean
  aiGuardian: AIGuardianConfig
}

export interface SenderDefaults {
  fromName: string
  fromAddress: string
  replyToEmail: string
}

export interface FormDefaults {
  theme: string
  urgency: 'standard' | 'urgent'
  emailType: string
  includeUnsubscribe: boolean
  /** Show the auto-generated Tags section in the Campaign tab. Tags are still collected when hidden. */
  showTagsSection: boolean
}

export interface LegalDisclaimerConfig {
  id: string
  label: string      // Display name, e.g. "South Africa — FSP Standard"
  region: string     // Which region this applies to (or 'GLOBAL')
  text: string       // Full disclaimer text
  isDefault: boolean // Whether this is the auto-selected default for the region
}

/** A single form-field → API-parameter mapping entry */
export interface PardotFieldMapping {
  id: string
  /** Dot-path into BriefFormData, e.g. "campaign.subjectLine" */
  formField: string
  /** Account Engagement API parameter name, e.g. "subject" or "customField__c" */
  apiParameter: string
  /** Which API object this parameter belongs to */
  apiObject: 'list-email' | 'prospect' | 'campaign'
  /** Optional transformation note shown in the UI */
  notes: string
}

export type PardotSenderType =
  | 'general_user'
  | 'specific_user'
  | 'assigned_user'
  | 'account_owner'
  | 'account_custom_field'
  | 'prospect_custom_field'

export type PardotEdition = 'growth' | 'plus' | 'advanced' | 'premium'

export interface PardotConfig {
  /** Use mock data instead of live API calls */
  useMockData: boolean

  // ── Environment ──────────────────────────────────────────────────
  /** Production uses login.salesforce.com / pi.pardot.com; Sandbox uses test.salesforce.com / pi.demo.pardot.com */
  environment: 'production' | 'sandbox'

  // ── Connected App (OAuth 2.0) ────────────────────────────────────
  /** Consumer Key from the Salesforce Connected App */
  clientId: string
  /** Consumer Secret from the Salesforce Connected App */
  clientSecret: string
  /** OAuth redirect/callback URI registered on the Connected App */
  redirectUri: string

  // ── Business Unit ────────────────────────────────────────────────
  /** Salesforce Account Engagement Business Unit ID (18-char, starts with 0Uv) */
  businessUnitId: string

  // ── Proxy & Instance ─────────────────────────────────────────────
  /**
   * URL of your server-side proxy that forwards requests to the Pardot v5 API.
   * Required — Account Engagement does not support browser CORS requests.
   */
  apiProxyUrl: string
  /**
   * Pardot instance base URL (derived from environment, can be overridden).
   * Standard: https://pi.pardot.com  |  EU: https://pi.eu.pardot.com
   */
  instanceUrl: string

  // ── API Version ──────────────────────────────────────────────────
  /** v5 is preferred for all new integrations; v4 for legacy AMPSEA accounts */
  apiVersion: 'v5' | 'v4'

  // ── Edition & Rate Limits ────────────────────────────────────────
  /** Account edition — determines daily API call limit */
  edition: PardotEdition

  // ── Email Defaults ───────────────────────────────────────────────
  /** Default Pardot list ID to use when none is specified in the brief */
  defaultListId: string
  /** Default Pardot campaign ID to associate with list emails */
  defaultCampaignId: string
  /** Default email template ID (integer string) */
  defaultEmailTemplateId: string
  /** Comma-separated list IDs to always suppress from sends */
  defaultSuppressionListIds: string

  // ── Sender & Reply-To ────────────────────────────────────────────
  senderType: PardotSenderType
  /** User ID when senderType is "specific_user" */
  senderUserId: string
  replyToType: PardotSenderType
  /** Static reply-to address when replyToType is "specific_user" */
  replyToAddress: string

  // ── Field Mappings ───────────────────────────────────────────────
  /** Manual mapping from brief form fields to Account Engagement API parameters */
  fieldMappings: PardotFieldMapping[]
}

/** Sender details that auto-populate when this campaign is selected */
export interface CampaignSenderPreset {
  fromName: string
  fromAddress: string
  replyToEmail: string
}

/** Content and design defaults that auto-populate when this campaign is selected */
export interface CampaignContentPreset {
  theme: string              // Brand theme id
  subjectLine: string
  previewText: string
  heroImageUrl: string       // Hero image URL
  headline: string
  subHeadline: string
  signatureId: string        // References SignoffEntry.id
  disclaimerId: string       // References LegalDisclaimerConfig.id
  distributionList: string   // Distribution list name/identifier
  pardotListId: string       // Pardot list ID
  greetingId?: string        // References GreetingConfig.id
}

export interface CampaignEntry {
  id: string
  name: string
  regions: string[]     // empty = applies to all regions
  channels: string[]    // empty = applies to all channels
  clientGroups: string[] // empty = applies to all client groups
  senderPreset?: CampaignSenderPreset // optional — auto-fills sender fields when selected
  contentPreset?: CampaignContentPreset // optional — auto-fills content/design fields when selected
  /**
   * Pardot Campaign ID for pulling Campaign Insights & Recommendations.
   * Numeric ID extracted from the campaign URL, e.g. "12345".
   */
  pardotCampaignId?: string
}

// ─── Greetings / Salutations ────────────────────────────────

export interface GreetingConfig {
  id: string
  label: string    // Display name, e.g. "Internal — Dear Colleague"
  value: string    // Actual greeting text / merge-field string
  isDefault: boolean
}

// ─── Footer Sign-off Signatures ─────────────────────────────

export interface SignoffEntry {
  id: string
  name: string        // Short display name, e.g. "Natalie Phillips – Deputy MD"
  text: string        // Full multiline sign-off text
  isDefault: boolean  // Pre-selected in the form
}

// ─── Asset Library ──────────────────────────────────────────

export type AssetCategory = 'header' | 'profile' | 'stripes' | 'logos' | 'graphics'

export interface AssetEntry {
  id: string
  name: string
  url: string
  category: AssetCategory
  colourOverlay?: string  // hex — shown as swatch on gallery card
  altText?: string
}

// ─── Custom Lists (extends built-in constants) ───────────────

export interface CustomEmailType {
  id: string    // machine value used as the form field value
  label: string // display label shown in the UI
}

export interface CustomClientGroup {
  id: string    // must be unique; used as the identifier
  name: string  // display name, e.g. "Middle East"
  regions: string[] // regions that belong to this client group
}

export interface CustomChannel {
  id: string    // machine value
  label: string // display label
}

export interface CustomRegion {
  name: string        // region name, e.g. "Kenya"
  clientGroup: string // which client group this region belongs to
}

// ─── Audit Trail ─────────────────────────────────────────────

export type AuditCategory =
  | 'auth'
  | 'brief'
  | 'kanban'
  | 'draft'
  | 'settings'
  | 'user'
  | 'export'

export interface AuditConfig {
  enabled: boolean
  retentionDays: number           // Auto-purge entries older than this (0 = keep forever)
  categories: Record<AuditCategory, boolean>  // Toggle individual categories
}

// ─── Campaign Insights ───────────────────────────────────────

export interface CampaignInsightsConfig {
  /** Show/hide the Campaign Insights module across the app */
  enabled: boolean
  /** Which tabs are visible in the expanded slide-over */
  tabs: {
    performance: boolean
    prospects: boolean
    timing: boolean
  }
  /** Show trend cards (CTR, Clicks, List Size) at the top of the panel */
  showTrendCards: boolean
  /** Show Key Insights section in the Performance tab */
  showKeyInsights: boolean
  /** Show Recommendations section */
  showRecommendations: boolean
}

// ─── Send Time Optimisation ──────────────────────────────────

export interface SendTimeOptimisationConfig {
  enabled: boolean
  minEventsRequired: number
}

// ─── Competitive Benchmarking ────────────────────────────────

export interface BenchmarksConfig {
  enabled: boolean
}

// ─── Audience Health ─────────────────────────────────────────

export interface AudienceHealthConfig {
  enabled: boolean
}

// ─── Header Types ────────────────────────────────────────────

export interface HeaderTypeAssets {
  logoUrl?: string
  stripeUrl?: string
  slimStripeUrl?: string
  thirtyFiveYearGraphicUrl?: string
}

export interface HeaderTypeConfig {
  id: string
  label: string
  description: string
  requiresHeroImage: boolean
  isDefault: boolean
  /** Built-in types can be edited but not deleted */
  builtIn: boolean
  enabled: boolean
  /** HTML code snippet for the email template producer */
  htmlSnippet: string
  /** Asset URLs associated with this header type */
  assets: HeaderTypeAssets
  /** Internal notes / usage guidance */
  notes: string
  /**
   * Brand theme IDs this header type is compatible with.
   * Empty array means compatible with all themes.
   */
  themeIds: string[]
}

// ─── Role Permissions ────────────────────────────────────────

export type RolePermissionKey =
  | 'canSubmitBriefs'
  | 'canViewAllBriefs'
  | 'canEditAnyBrief'
  | 'canDeleteBriefs'
  | 'canViewKanban'
  | 'canMoveKanbanCards'
  | 'canDeleteKanbanCards'
  | 'canViewAnalytics'
  | 'canManageAssets'
  | 'canManageTemplates'
  | 'canExportData'
  | 'canAccessSettings'
  | 'canConfigureNotifications'
  | 'canManageApprovals'
  | 'canManageUsers'

export type RolePermissions = Record<RolePermissionKey, boolean>

export interface RolePermissionConfig {
  admin: RolePermissions
  producer: RolePermissions
  requester: RolePermissions
}

// ─── User Groups (Teams) ─────────────────────────────────────

export interface UserGroup {
  id: string
  name: string
  description: string
  memberIds: string[]
  colour: string
  createdAt: string
}

// ─── Full AppSettings ────────────────────────────────────────

export interface AppSettings {
  brandThemes: BrandThemeConfig[]
  htmlTemplates: HtmlTemplateConfig[]
  htmlModules: HtmlModuleConfig[]
  formSteps: FormStepConfig[]
  formFields: FormFieldConfig[]
  brandGuardian: BrandGuardianConfig
  senderDefaults: SenderDefaults
  formDefaults: FormDefaults
  legalDisclaimers: LegalDisclaimerConfig[]
  n8nWebhookUrl: string
  pardot: PardotConfig
  campaigns: CampaignEntry[]
  // Sign-off signatures
  signoffs: SignoffEntry[]
  // Asset library
  assets: AssetEntry[]
  // Custom list extensions
  customEmailTypes: CustomEmailType[]
  customClientGroups: CustomClientGroup[]
  customChannels: CustomChannel[]
  customRegions: CustomRegion[]
  // Audit trail
  audit: AuditConfig
  // Campaign Insights
  campaignInsights: CampaignInsightsConfig
  // Approvals
  approvals: import('./approval.types').ApprovalConfig
  // Send Time Optimisation
  sendTimeOptimisation: SendTimeOptimisationConfig
  // Competitive Benchmarking
  benchmarks: BenchmarksConfig
  // Audience Health
  audienceHealth: AudienceHealthConfig
  // Greetings / Salutations
  greetings: GreetingConfig[]
  // Power Automate notifications
  notifications: import('./notifications.types').NotificationsSettings
  // Role permissions matrix
  rolePermissions: RolePermissionConfig
  // User groups (Teams)
  userGroups: UserGroup[]
  // Header types
  headers: HeaderTypeConfig[]
  // Power Automate
  powerAutomate: PowerAutomateConfig
  // Design Briefing Platform
  designBriefing: DesignBriefingSettings
  // Campaign Planner
  campaignPlanner: CampaignPlannerSettings
}

// ─── Power Automate ──────────────────────────────────────────

export interface PowerAutomateFlowEndpoint {
  /** Webhook URL from the "When an HTTP request is received" trigger */
  webhookUrl: string
  /** Whether this flow endpoint is active */
  enabled: boolean
}

export interface PowerAutomateFieldMapping {
  id: string
  /** Brief field path e.g. "campaign.subjectLine" */
  briefField: string
  /** Power Automate flow input parameter name */
  flowParameter: string
  notes: string
}

export interface PowerAutomateConfig {
  /** Master enable toggle — when false, no flows are triggered */
  enabled: boolean

  // ── Flow endpoints ──────────────────────────────────────────
  /** Triggered when a brief is submitted */
  briefSubmissionFlow: PowerAutomateFlowEndpoint
  /** Triggered to request Pardot list health analysis */
  listAnalysisFlow: PowerAutomateFlowEndpoint
  /** Triggered to request Pardot campaign performance insights */
  campaignInsightsFlow: PowerAutomateFlowEndpoint

  // ── Security ────────────────────────────────────────────────
  /** Optional custom header name to pass a shared secret (e.g. "x-api-key") */
  secretHeaderName: string
  /** Shared secret value sent in the header above */
  secretHeaderValue: string

  // ── Payload options ─────────────────────────────────────────
  /** Include the full serialised BriefPayload in the submission body */
  includeFullBrief: boolean
  /** Include campaign preset and settings metadata */
  includeCampaignConfig: boolean
  /** Include Kanban card metadata (column, urgency, dates) */
  includeKanbanData: boolean

  // ── Retry / timeout ─────────────────────────────────────────
  /** Retry once after 5 s on network-level failure */
  retryOnFailure: boolean
  /** HTTP timeout in seconds (3–60) */
  timeoutSeconds: number

  // ── Custom field mappings ────────────────────────────────────
  /** Maps brief fields to Power Automate flow input parameter names */
  fieldMappings: PowerAutomateFieldMapping[]
}

// ─── Design Briefing Settings ────────────────────────────────

export interface DesignFieldSettings {
  id: string
  visible: boolean
  order: number
}

export interface DesignAssetTypeSettings {
  id: string
  enabled: boolean
  fields: DesignFieldSettings[]
}

export interface DesignBriefingSettings {
  enabled: boolean
  defaultRequesterName: string
  defaultRequesterEmail: string
  allowMockups: boolean
  maxAttachments: number
  assetTypes: DesignAssetTypeSettings[]
}

// ─── Campaign Planner Settings ───────────────────────────────

export interface CampaignPlannerSettings {
  /** Default view when opening the planner */
  defaultView: 'kanban' | 'list' | 'timeline' | 'calendar'
  /** Which Kanban columns are visible */
  visibleColumns: ('briefed' | 'in-progress' | 'distributed')[]
  /** Whether to show the assignee field in card tiles */
  showAssignee: boolean
  /** Whether to show progress bars in card tiles */
  showProgress: boolean
  /** Allow users to add manual campaigns (not from brief submissions) */
  allowManualCampaigns: boolean
}

export type SettingsTab =
  | 'headers'
  | 'general'
  | 'campaigns'
  | 'lists'
  | 'signatures'
  | 'users'
  | 'themes'
  | 'templates'
  | 'assets'
  | 'modules'
  | 'layout'
  | 'guardian'
  | 'disclaimers'
  | 'pardot'
  | 'audit'
  | 'insights'
  | 'approvals'
  | 'send-time'
  | 'benchmarks'
  | 'audience-health'
  | 'greetings'
  | 'notifications'
  | 'power-automate'
  | 'design-briefing'
  | 'campaign-planner'
