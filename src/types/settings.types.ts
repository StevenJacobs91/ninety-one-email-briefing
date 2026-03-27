// ─── Settings Types ─────────────────────────────────────────

export interface BrandThemeConfig {
  id: string
  label: string
  primary: string
  accent: string
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

export interface AppSettings {
  brandThemes: BrandThemeConfig[]
  htmlTemplates: HtmlTemplateConfig[]
  htmlModules: HtmlModuleConfig[]
  formSteps: FormStepConfig[]
  formFields: FormFieldConfig[]
  brandGuardian: BrandGuardianConfig
}

export type SettingsTab =
  | 'themes'
  | 'templates'
  | 'modules'
  | 'layout'
  | 'guardian'
