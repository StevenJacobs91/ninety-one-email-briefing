// ─── Settings Types ─────────────────────────────────────────

export interface BrandThemeConfig {
  id: string
  label: string
  primary: string
  accent: string
  logoUrl?: string        // Header logo image URL (120×60 px)
  stripeUrl?: string      // Decorative stripe image URL (200×234 px)
  footerLogoUrl?: string  // Footer logo image URL (120×130 px)
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
}

export interface LegalDisclaimerConfig {
  id: string
  label: string      // Display name, e.g. "South Africa — FSP Standard"
  region: string     // Which region this applies to (or 'GLOBAL')
  text: string       // Full disclaimer text
  isDefault: boolean // Whether this is the auto-selected default for the region
}

export interface PardotConfig {
  /** Use mock data instead of live API calls */
  useMockData: boolean
  /** Salesforce Account Engagement Business Unit ID (18-char) */
  businessUnitId: string
  /**
   * URL of your server-side proxy that forwards requests to the Pardot v5 API.
   * Required when useMockData = false.
   */
  apiProxyUrl: string
  /**
   * Pardot instance base URL.
   * Standard: https://pi.pardot.com  |  EU: https://pi.eu.pardot.com
   */
  instanceUrl: string
}

/** Sender details that auto-populate when this campaign is selected */
export interface CampaignSenderPreset {
  fromName: string
  fromAddress: string
  replyToEmail: string
}

export interface CampaignEntry {
  id: string
  name: string
  regions: string[]     // empty = applies to all regions
  channels: string[]    // empty = applies to all channels
  clientGroups: string[] // empty = applies to all client groups
  senderPreset?: CampaignSenderPreset // optional — auto-fills sender fields when selected
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
}

export type SettingsTab =
  | 'general'
  | 'campaigns'
  | 'lists'
  | 'signatures'
  | 'themes'
  | 'templates'
  | 'assets'
  | 'modules'
  | 'layout'
  | 'guardian'
  | 'disclaimers'
  | 'pardot'
