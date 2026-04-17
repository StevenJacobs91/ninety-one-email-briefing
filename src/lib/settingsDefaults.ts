import type {
  AppSettings,
  BrandThemeConfig,
  HtmlTemplateConfig,
  HtmlModuleConfig,
  FormStepConfig,
  FormFieldConfig,
  BrandGuardianConfig,
  ModuleCategory,
  SenderDefaults,
  FormDefaults,
  LegalDisclaimerConfig,
  PardotConfig,
  CampaignEntry,
  SignoffEntry,
  AssetEntry,
  CampaignInsightsConfig,
  BenchmarksConfig,
  AudienceHealthConfig,
  GreetingConfig,
  RolePermissionConfig,
  RolePermissionKey,
  HeaderTypeConfig,
} from '../types/settings.types'
import type { ApprovalConfig } from '../types/approval.types'
import {
  NOTIFICATION_EVENT_META,
  type NotificationsSettings,
  type NotificationEventConfig,
  type NotificationEventType,
} from '../types/notifications.types'
import { REGION_LEGAL_DISCLAIMERS, REGIONS } from './constants'
import { PRESET_CAMPAIGNS } from './campaignPresets'
import { PRESET_PROFILE_ASSETS, PRESET_HEADER_ASSETS } from './assetLibraryData'

// ─── Default Brand Themes ───────────────────────────────────

// ─── Shared asset URLs ───────────────────────────────────────

// Header logos (accent-colour variant — shown on primary-coloured header)
const LOGO_CAPE_CORAL    = 'https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png'
const LOGO_WARM_YELLOW   = 'https://weare.ninetyone.com/l/28902/2020-09-03/8yq1t3/28902/254044/91_logo_digital_warm_yellowwood__300x150.png'
const LOGO_GAZANIA_GOLD  = 'https://weare.ninetyone.com/l/28902/2020-05-08/8vsb6s/28902/242653/91_Logo_Digital_gazania_gold_header_logo_300x150.png'
const LOGO_PROTEA_RED    = 'https://weare.ninetyone.com/l/28902/2020-05-25/8w44wl/28902/244211/protea_red_header_logo_300x150.png'
const LOGO_OCEAN_TEAL    = 'https://weare.ninetyone.com/l/28902/2020-05-26/8w5gz6/28902/244259/91_logo_digital_ocean_teal_header_300x150.png'
const LOGO_PINOTAGE      = 'https://weare.ninetyone.com/l/28902/2020-05-07/8vr21n/28902/242409/91_logo_digital_pinotage_burgandy_header_300x150.png'
const LOGO_LEATHERBACK   = 'https://weare.ninetyone.com/l/28902/2020-05-20/8w12cq/28902/243761/91_Logo_Digital_Leatherback_Green_Footer_300x150.png'

// Stripes (accent-colour variant)
const STRIPE_CAPE_CORAL  = 'https://weare.ninetyone.com/l/28902/2020-02-28/8t5jbh/28902/235072/banner_stripes_cape_coral_200x234.png'
const STRIPE_WARM_YELLOW = 'https://weare.ninetyone.com/l/28902/2020-03-24/8tsmvs/28902/237457/banner_stripes_warm_yellow_200x234.png'
const STRIPE_GAZANIA_GOLD= 'https://weare.ninetyone.com/l/28902/2020-03-24/8tsmll/28902/237441/Gazania_Gold_Stripes_200x234.png'
const STRIPE_PROTEA_RED  = 'https://weare.ninetyone.com/l/28902/2020-03-18/8tp99r/28902/236986/protea_red_header_stripes_top_right_200x234.png'
const STRIPE_OCEAN_TEAL  = 'https://weare.ninetyone.com/l/28902/2020-03-10/8thy2m/28902/236108/stripes_ocean_teal_200x234.png'
const STRIPE_PINOTAGE    = 'https://weare.ninetyone.com/l/28902/2020-05-08/8vrxhs/28902/242607/banner_stripes_pinotage_burgandy_267x312.png'
const STRIPE_LEATHERBACK = 'https://weare.ninetyone.com/l/28902/2020-02-27/8t4hkk/28902/234894/banner_stripes_leatherback_green_200x234.png'

// Footer logos (accent-colour variant)
const FOOTER_CAPE_CORAL  = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nr7/28902/16251315203TFUilGT/Footer_logo_Cape_Coral_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_WARM_YELLOW = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nrc/28902/1625131521ZUcVLEZg/Footer_logo_Warm_Yellowwood_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_GAZANIA_GOLD= 'https://weare.ninetyone.com/l/28902/2021-07-01/978nrf/28902/16251315213K8Jjyrr/Footer_logo_Gazania_Gold_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_PROTEA_RED  = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nr1/28902/1625131519rZuPhU68/Footer_logo_Protea_Red_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_OCEAN_TEAL  = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nqk/28902/1625131519GGrTdgnT/Footer_logo_Ocean_Teal_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_PINOTAGE    = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nqw/28902/16251315196vK7Ae81/Footer_logo_Pinotage_Burgundy_IFAWOC_HEXlogo_91_300x324px.png'
const FOOTER_LEATHERBACK = 'https://weare.ninetyone.com/l/28902/2021-07-01/978nqy/28902/1625131519rCwRRl65/Footer_logo_Leatherback_Green_IFAWOC_HEXlogo_91_300x324px.png'

function tints(hex: string): { tint01: string; tint02: string; tint03: string } {
  const adj = (h: string, pct: number) => {
    const n = parseInt(h.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + Math.round(2.55 * pct)))
    const g = Math.min(255, Math.max(0, ((n >> 8)  & 0xff) + Math.round(2.55 * pct)))
    const b = Math.min(255, Math.max(0, ( n        & 0xff) + Math.round(2.55 * pct)))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }
  return { tint01: adj(hex, 10), tint02: adj(hex, -5), tint03: adj(hex, -20) }
}

export const DEFAULT_BRAND_THEMES: BrandThemeConfig[] = [
  { id: 'leatherback-coral',    label: 'Leatherback Green / Cape Coral',        primary: '#134848', ...tints('#134848'), accent: '#fbaa96', logoUrl: LOGO_CAPE_CORAL,   stripeUrl: STRIPE_CAPE_CORAL,   footerLogoUrl: FOOTER_CAPE_CORAL   },
  { id: 'leatherback-yellowood',label: 'Leatherback Green / Warm Yellowwood',   primary: '#134848', ...tints('#134848'), accent: '#fcaa28', logoUrl: LOGO_WARM_YELLOW,  stripeUrl: STRIPE_WARM_YELLOW,  footerLogoUrl: FOOTER_WARM_YELLOW  },
  { id: 'marula-gold',          label: 'Marula Green / Gazania Gold',           primary: '#0a3323', ...tints('#0a3323'), accent: '#cf6f13', logoUrl: LOGO_GAZANIA_GOLD, stripeUrl: STRIPE_GAZANIA_GOLD, footerLogoUrl: FOOTER_GAZANIA_GOLD },
  { id: 'marula-coral',         label: 'Marula Green / Cape Coral',             primary: '#0a3323', ...tints('#0a3323'), accent: '#fbaa96', logoUrl: LOGO_CAPE_CORAL,   stripeUrl: STRIPE_CAPE_CORAL,   footerLogoUrl: FOOTER_CAPE_CORAL   },
  { id: 'pinotage-coral',       label: 'Pinotage Burgundy / Cape Coral',        primary: '#591739', ...tints('#591739'), accent: '#fbaa96', logoUrl: LOGO_CAPE_CORAL,   stripeUrl: STRIPE_CAPE_CORAL,   footerLogoUrl: FOOTER_CAPE_CORAL   },
  { id: 'springbok-red',        label: 'Springbok Cream / Protea Red',          primary: '#e8e5ce', ...tints('#e8e5ce'), accent: '#d83949', logoUrl: LOGO_PROTEA_RED,   stripeUrl: STRIPE_PROTEA_RED,   footerLogoUrl: FOOTER_PROTEA_RED   },
  { id: 'springbok-teal',       label: 'Springbok Cream / Ocean Teal',          primary: '#e8e5ce', ...tints('#e8e5ce'), accent: '#009d80', logoUrl: LOGO_OCEAN_TEAL,   stripeUrl: STRIPE_OCEAN_TEAL,   footerLogoUrl: FOOTER_OCEAN_TEAL   },
  { id: 'springbok-burgundy',   label: 'Springbok Cream / Pinotage Burgundy',   primary: '#e8e5ce', ...tints('#e8e5ce'), accent: '#591739', logoUrl: LOGO_PINOTAGE,     stripeUrl: STRIPE_PINOTAGE,     footerLogoUrl: FOOTER_PINOTAGE     },
  { id: 'agulhas-gold',         label: 'Agulhas Indigo / Gazania Gold',         primary: '#221b3b', ...tints('#221b3b'), accent: '#cf6f13', logoUrl: LOGO_GAZANIA_GOLD, stripeUrl: STRIPE_GAZANIA_GOLD, footerLogoUrl: FOOTER_GAZANIA_GOLD },
  { id: 'agulhas-teal',         label: 'Agulhas Indigo / Ocean Teal',           primary: '#221b3b', ...tints('#221b3b'), accent: '#009d80', logoUrl: LOGO_OCEAN_TEAL,   stripeUrl: STRIPE_OCEAN_TEAL,   footerLogoUrl: FOOTER_OCEAN_TEAL   },
  { id: 'agulhas-red',          label: 'Agulhas Indigo / Protea Red',           primary: '#221b3b', ...tints('#221b3b'), accent: '#d83949', logoUrl: LOGO_PROTEA_RED,   stripeUrl: STRIPE_PROTEA_RED,   footerLogoUrl: FOOTER_PROTEA_RED   },
  { id: 'agulhas-coral',        label: 'Agulhas Indigo / Cape Coral',           primary: '#221b3b', ...tints('#221b3b'), accent: '#fbaa96', logoUrl: LOGO_CAPE_CORAL,   stripeUrl: STRIPE_CAPE_CORAL,   footerLogoUrl: FOOTER_CAPE_CORAL   },
  { id: 'agulhas-yellowwood',   label: 'Agulhas Indigo / Warm Yellowwood',      primary: '#221b3b', ...tints('#221b3b'), accent: '#fcaa28', logoUrl: LOGO_WARM_YELLOW,  stripeUrl: STRIPE_WARM_YELLOW,  footerLogoUrl: FOOTER_WARM_YELLOW  },
  { id: 'galjoen-coral',        label: 'Galjoen Gray / Cape Coral',             primary: '#74908d', ...tints('#74908d'), accent: '#fbaa96', logoUrl: LOGO_CAPE_CORAL,   stripeUrl: STRIPE_CAPE_CORAL,   footerLogoUrl: FOOTER_CAPE_CORAL   },
  { id: 'galjoen-green',        label: 'Galjoen Gray / Leatherback Green',      primary: '#74908d', ...tints('#74908d'), accent: '#134848', logoUrl: LOGO_LEATHERBACK,  stripeUrl: STRIPE_LEATHERBACK,  footerLogoUrl: FOOTER_LEATHERBACK  },
]

// ─── Default HTML Templates ─────────────────────────────────

export const DEFAULT_HTML_TEMPLATES: HtmlTemplateConfig[] = [
  { themeId: 'leatherback-coral', filename: 'Leatherback_Green_Cape_Coral_-_All_Modules.html' },
  { themeId: 'marula-gold', filename: 'Marula_Green_Gazania_Gold_-_All_Modules.html' },
  { themeId: 'marula-coral', filename: 'Marula_Green_Cape_Coral_-_All_Modules.html' },
  { themeId: 'pinotage-coral', filename: 'Pinotage_Burgundy_Cape_Coral_-_All_Modules.html' },
  { themeId: 'springbok-red', filename: 'Springbok_Cream_Protea_Red_-_All_Modules.html' },
  { themeId: 'springbok-teal', filename: 'Springbok_Cream_Ocean_Teal_-_All_Modules.html' },
  { themeId: 'springbok-burgundy', filename: 'Springbok_Cream_Pinotage_Burgundy_-_All_Modules.html' },
  { themeId: 'agulhas-gold', filename: 'Agulhas_Indigo_Gazania_Gold_-_All_Modules.html' },
  { themeId: 'agulhas-teal', filename: 'Agulhas_Indigo_Ocean_Teal_-_All_Modules.html' },
  { themeId: 'agulhas-red', filename: 'Agulhas_Indigo_Protea_Red_-_All_Modules.html' },
  { themeId: 'agulhas-coral', filename: 'Agulhas_Indigo_Cape_Coral_-_All_Modules.html' },
  { themeId: 'agulhas-yellowwood', filename: 'Agulhas_Indigo_Warm_Yellowwood_-_All_Modules.html' },
  { themeId: 'galjoen-coral', filename: 'Galjoen_Gray_Cape_Coral_-_All_Modules.html' },
  { themeId: 'galjoen-green', filename: 'Galjoen_Gray_Leatherback_Green_-_All_Modules.html' },
]

// ─── Default HTML Modules ───────────────────────────────────

const MODULE_CATEGORIES: Record<string, ModuleCategory> = {
  'header-': 'Headers',
  'greeting': 'Content',
  'body-': 'Content',
  'inner-content': 'Content',
  'numbered-': 'Content',
  'podcast': 'Media',
  'video-': 'Media',
  'cta-': 'CTAs',
  'event-': 'Events',
  'itinerary': 'Events',
  'speaker': 'Speakers',
  'article-': 'Articles',
  'gallery-': 'Media',
  'tabs-': 'Navigation',
  'footer-': 'Footers',
}

function categoriseModule(id: string): ModuleCategory {
  for (const [prefix, cat] of Object.entries(MODULE_CATEGORIES)) {
    if (id.startsWith(prefix)) return cat
  }
  return 'Content'
}

export const DEFAULT_HTML_MODULES: HtmlModuleConfig[] = [
  { id: 'header-small', label: 'Small Header', description: 'Logo with headline and subtitle' },
  { id: 'header-image', label: 'Header with Background Image', description: 'Full-width hero image with overlay text' },
  { id: 'greeting', label: 'Greeting / Salutation', description: 'Personalised greeting with Pardot merge fields' },
  { id: 'body-content', label: 'Body Content', description: 'Standard paragraph text block' },
  { id: 'body-content-list', label: 'Body Content with Bullet List', description: 'Dash-separated key points list' },
  { id: 'body-inner-content', label: 'Inner Content Block', description: 'Tinted background content card with heading' },
  { id: 'inner-content-v1', label: 'Inner Content with Link CTA', description: 'Content card with inline tertiary link CTA' },
  { id: 'inner-content-v2', label: 'Inner Content with Dash List', description: 'Tinted card with heading/body dash list items' },
  { id: 'inner-content-v3', label: 'Feedback / Survey Block', description: 'Content block with secondary CTA button' },
  { id: 'numbered-section-v1', label: 'Numbered Section (Flat)', description: 'Numbered list items on primary background' },
  { id: 'numbered-section-v2', label: 'Numbered Section (Card)', description: 'Numbered list items in tinted card' },
  { id: 'podcast', label: 'Podcast Module', description: 'Spotify + Apple Podcasts badges with description' },
  { id: 'video-rollover', label: 'Video Play Rollover', description: 'Image with play button overlay linking to video' },
  { id: 'cta-single-primary', label: 'Single Primary CTA', description: 'One accent-coloured action button' },
  { id: 'cta-primary-secondary', label: 'Primary + Secondary CTA', description: 'Primary button with outlined secondary button' },
  { id: 'cta-dual-secondary', label: 'Dual Secondary CTAs', description: 'Two outlined secondary buttons side by side' },
  { id: 'cta-single-secondary', label: 'Single Secondary CTA', description: 'One outlined secondary button' },
  { id: 'cta-1primary-2secondary', label: '1 Primary + 2 Secondary CTAs', description: 'Primary button with two secondary buttons' },
  { id: 'event-registration-1cta', label: 'Event Registration (1 CTA)', description: 'Event details with date, time, venue and register button' },
  { id: 'event-registration-2cta', label: 'Event Registration (2 CTAs)', description: 'Event details with two registration buttons' },
  { id: 'event-registration-v3', label: 'Event Registration (Compact)', description: 'Compact event details with speaker list' },
  { id: 'event-registration-v4', label: 'Event Registration (Card)', description: 'Event details in tinted card layout' },
  { id: 'event-registration-v5', label: 'Event Registration (Full)', description: 'Full event layout with agenda and speakers' },
  { id: 'itinerary-table', label: 'Itinerary / Agenda Table', description: 'Time-slot table for event schedules' },
  { id: 'speaker-2pm-1cta', label: '2 Portfolio Managers + 1 CTA', description: 'Two PM profiles with shared CTA button' },
  { id: 'speaker-2pm-3cta', label: '2 Portfolio Managers + 3 CTAs', description: 'Two PM profiles with individual CTAs' },
  { id: 'speaker-1pm', label: 'Single Portfolio Manager', description: 'Single PM profile with bio and photo' },
  { id: 'speakers-2col', label: 'Speakers (2 Column)', description: 'Two speaker cards side by side' },
  { id: 'speakers-3col', label: 'Speakers (3 Column)', description: 'Three speaker cards in a row' },
  { id: 'article-list-v1', label: 'Article List (Standard)', description: 'Stacked article cards with thumbnails' },
  { id: 'article-list-v2', label: 'Article List (Compact)', description: 'Compact article list with small thumbnails' },
  { id: 'article-list-v3', label: 'Article List (Featured)', description: 'Featured article with large image and supporting articles' },
  { id: 'gallery-v1', label: 'Image Gallery (2 Column)', description: 'Two images side by side' },
  { id: 'gallery-v2', label: 'Image Gallery (3 Column)', description: 'Three images in a row' },
  { id: 'tabs-main', label: 'Main Tab Navigation', description: 'Tabbed navigation buttons for anchored sections' },
  { id: 'tabs-anchors', label: 'Tab Anchor Links', description: 'Inline anchor links for content navigation' },
  { id: 'footer-v1', label: 'Footer (Standard)', description: 'Logo, website link, privacy notice' },
  { id: 'footer-v2', label: 'Footer (Compact)', description: 'Compact footer with three inline links' },
  { id: 'footer-v3', label: 'Footer (Contact Details)', description: 'Full footer with team contact information' },
].map((m) => ({ ...m, category: categoriseModule(m.id), enabled: true }))

// ─── Default Form Steps ─────────────────────────────────────

export const DEFAULT_FORM_STEPS: FormStepConfig[] = [
  { id: 'campaign', label: 'Campaign', order: 0, visible: true },
  { id: 'content', label: 'Content', order: 1, visible: true },
  { id: 'review', label: 'Brief Review', order: 2, visible: true },
]

// ─── Default Form Fields ────────────────────────────────────

export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  // Step 0 — Campaign (core email identity fields only)
  { id: 'campaign.emailDescription', label: 'Email Description', stepIndex: 0, required: false, visible: true, order: 0 },
  { id: 'campaign.emailType',        label: 'Email Type',        stepIndex: 0, required: true,  visible: true, order: 1 },
  { id: 'campaign.campaignName',     label: 'Campaign Name',     stepIndex: 0, required: true,  visible: true, order: 2 },
  { id: 'campaign.theme',            label: 'Brand Theme',       stepIndex: 0, required: true,  visible: true, order: 3 },
  { id: 'campaign.subjectLine',      label: 'Subject Line',      stepIndex: 0, required: true,  visible: true, order: 4 },
  { id: 'campaign.previewText',      label: 'Preview Text',      stepIndex: 0, required: true,  visible: true, order: 5 },
  { id: 'campaign.fromName',         label: 'From Name',         stepIndex: 0, required: true,  visible: true, order: 6 },
  { id: 'campaign.fromAddress',      label: 'From Address',      stepIndex: 0, required: true,  visible: true, order: 7 },
  { id: 'campaign.replyToEmail',     label: 'Reply-To Email',    stepIndex: 0, required: false, visible: true, order: 8 },

  // Step 1 — Content
  { id: 'content.headline',          label: 'Headline',           stepIndex: 1, required: true,  visible: true, order: 0 },
  { id: 'content.bodyIntro',         label: 'Body Intro',         stepIndex: 1, required: true,  visible: true, order: 1 },
  { id: 'content.sections',          label: 'Content Sections',   stepIndex: 1, required: true,  visible: true, order: 2 },
  { id: 'content.modules',           label: 'Email Modules',      stepIndex: 1, required: false, visible: true, order: 3 },
  { id: 'content.cta',               label: 'Call to Action',     stepIndex: 1, required: true,  visible: true, order: 4 },
  { id: 'content.legalDisclaimer',   label: 'Legal Disclaimer',   stepIndex: 1, required: false, visible: true, order: 5 },
  { id: 'content.includeUnsubscribe',label: 'Include Unsubscribe',stepIndex: 1, required: false, visible: true, order: 6 },

  // Step 2 — Brief Review (controls which sections appear in the review summary)
  { id: 'review.campaignSection',   label: 'Campaign Section',   stepIndex: 2, required: false, visible: true, order: 0 },
  { id: 'review.audienceSection',   label: 'Audience Section',   stepIndex: 2, required: false, visible: true, order: 1 },
  { id: 'review.contentSection',    label: 'Content Section',    stepIndex: 2, required: false, visible: true, order: 2 },
  { id: 'review.assetsSection',     label: 'Assets Section',     stepIndex: 2, required: false, visible: true, order: 3 },
  { id: 'review.deadlinesSection',  label: 'Deadlines Section',  stepIndex: 2, required: false, visible: true, order: 4 },
  { id: 'review.exportOptions',     label: 'Export Options',     stepIndex: 2, required: false, visible: true, order: 5 },
]

// ─── Default Brand Guardian Config ──────────────────────────

export const DEFAULT_BRAND_GUARDIAN: BrandGuardianConfig = {
  minimumScore: 85,
  subjectLineMaxLength: 60,
  subjectLineMobileOptimal: 50,
  previewTextMinLength: 30,
  bodyIntroMaxLength: 200,
  headlineWarnLength: 60,
  sectionBodyWarnLength: 400,
  ctaLabelMaxLength: 25,
  maxExclamationMarks: 2,
  requireNinetyOneDomain: true,
  spamTriggerWords: ['free', 'act now', 'limited time', 'guaranteed', 'click here', 'buy now', 'urgent', '!!!', 'winner', 'congratulations'],
  brandNameVariants: ['ninetyone', 'ninety-one', 'ninety 1', '91 '],
  minDaysBetweenApprovalAndSend: 2,
  enableAccessibilityChecks: true,
  enableComplianceChecks: true,
  enableBrandVoiceChecks: true,
  enableContentStructureChecks: true,
  enableAudienceAlignmentChecks: true,
  enableBrandProtectionChecks: true,
  aiGuardian: {
    mode: 'optional',
    model: 'claude-sonnet-4-20250514',
    supabaseUrl: '',
    supabaseAnonKey: '',
    customSystemPrompt: '',
  },
}

// ─── Default Sender Defaults ────────────────────────────────

export const DEFAULT_SENDER_DEFAULTS: SenderDefaults = {
  fromName: 'Ninety One',
  fromAddress: '',
  replyToEmail: '',
}

// ─── Default Form Defaults ──────────────────────────────────

export const DEFAULT_FORM_DEFAULTS: FormDefaults = {
  theme: 'leatherback-coral',
  urgency: 'standard',
  emailType: 'campaign',
  includeUnsubscribe: true,
  showTagsSection: true,
}

// ─── Default Legal Disclaimers ──────────────────────────────

export const DEFAULT_LEGAL_DISCLAIMERS: LegalDisclaimerConfig[] = [
  // Seed from REGION_LEGAL_DISCLAIMERS for every known region
  ...REGIONS.map((region) => ({
    id: `disclaimer-${region.toLowerCase().replace(/\s+/g, '-')}`,
    label: `${region} — Standard`,
    region,
    text: REGION_LEGAL_DISCLAIMERS[region] ?? REGION_LEGAL_DISCLAIMERS['GLOBAL'],
    isDefault: true,
  })),
  // Global fallback
  {
    id: 'disclaimer-global',
    label: 'Global — Standard',
    region: 'GLOBAL',
    text: REGION_LEGAL_DISCLAIMERS['GLOBAL'],
    isDefault: true,
  },
]

// ─── Default Pardot Config ──────────────────────────────────

export const DEFAULT_PARDOT_CONFIG: PardotConfig = {
  useMockData: true,
  environment: 'production',
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  businessUnitId: '',
  apiProxyUrl: '',
  instanceUrl: 'https://pi.pardot.com',
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
  fieldMappings: [
    { id: 'fm-1', formField: 'campaign.subjectLine',   apiParameter: 'subject',                 apiObject: 'list-email', notes: '' },
    { id: 'fm-2', formField: 'campaign.campaignName',  apiParameter: 'name',                    apiObject: 'list-email', notes: 'Used as internal email label' },
    { id: 'fm-3', formField: 'audience.pardotListId',  apiParameter: 'recipientListIds',         apiObject: 'list-email', notes: 'Comma-separated list IDs' },
    { id: 'fm-4', formField: 'campaign.fromName',      apiParameter: 'senderOptions.name',      apiObject: 'list-email', notes: '' },
    { id: 'fm-5', formField: 'campaign.fromAddress',   apiParameter: 'senderOptions.address',   apiObject: 'list-email', notes: '' },
    { id: 'fm-6', formField: 'campaign.replyToEmail',  apiParameter: 'replyToOptions.address',  apiObject: 'list-email', notes: '' },
    { id: 'fm-7', formField: 'deadlines.sendDate',     apiParameter: 'scheduledTime',           apiObject: 'list-email', notes: 'ISO 8601 — convert from YYYY-MM-DD' },
  ],
}

// ─── Default Campaigns ──────────────────────────────────────

export const DEFAULT_CAMPAIGNS: CampaignEntry[] = PRESET_CAMPAIGNS

// ─── Default Sign-off Signatures ────────────────────────────

export const DEFAULT_SIGNOFFS: SignoffEntry[] = [
  {
    id: 'signoff-ninety-one',
    name: 'Ninety One (Corporate)',
    text: 'Kind regards,\n\nNinety One\nwww.ninetyone.com',
    isDefault: true,
  },
]

// ─── Default Asset Library ──────────────────────────────────

export const DEFAULT_ASSETS: AssetEntry[] = [
  {
    id: 'header-706930897',
    name: '706930897',
    url: 'https://weare.ninetyone.com/l/28902/2026-03-26/9rcd7f/28902/1774526442D8Sbd9kn/header_706930897_v2_600x270.jpg',
    category: 'header',
    colourOverlay: '#221b3b',
    altText: 'Ninety One header 706930897',
  },
  {
    id: 'header-865361620',
    name: '865361620',
    url: 'https://weare.ninetyone.com/l/28902/2026-03-23/9rc1bb/28902/1774251573kfgNwj5t/header_865361620_0a3323_overlay_v1_640x270.jpg',
    category: 'header',
    colourOverlay: '#0a3323',
    altText: 'Ninety One header 865361620',
  },
  {
    id: 'header-1044498000',
    name: '1044498000',
    url: 'https://weare.ninetyone.com/l/28902/2026-01-23/9r7qcx/28902/1769168599dmgitMJj/header_1044498000_v5_640x250.jpg',
    category: 'header',
    colourOverlay: '#221b3b',
    altText: 'Ninety One header 1044498000',
  },
  ...PRESET_HEADER_ASSETS,
  ...PRESET_PROFILE_ASSETS,
]

// ─── Default Greetings ──────────────────────────────────────

export const DEFAULT_GREETINGS: GreetingConfig[] = [
  { id: 'greeting-internal',        label: 'Internal — Dear Colleague',     value: 'Dear Colleague,',                                          isDefault: false },
  { id: 'greeting-investor',        label: 'Investor — Dear Investor',       value: 'Dear Investor,',                                           isDefault: false },
  { id: 'greeting-hello',           label: 'Hello',                          value: 'Hello,',                                                   isDefault: false },
  { id: 'greeting-standard-sa',     label: 'Standard SA — Dear Adviser',     value: 'Dear Financial Adviser,',                                  isDefault: false },
  { id: 'greeting-standard-global', label: 'Standard Global',                value: 'Dear {{Recipient.FirstName}},',                            isDefault: false },
  { id: 'greeting-broker-preferred',label: 'Broker — Preferred Name',        value: 'Dear {{Recipient.FirstName}},',                            isDefault: false },
  { id: 'greeting-dear-last-name',  label: 'Dear Last Name',                 value: 'Dear {{Recipient.LastName}},',                             isDefault: false },
  { id: 'greeting-korea',           label: 'Korea',                          value: '{{Recipient.FirstName}}님, 안녕하세요.',                  isDefault: false },
  { id: 'greeting-japan',           label: 'Japan',                          value: '{{Recipient.LastName}}様',                                  isDefault: false },
]

// ─── Send Time Optimisation Defaults ────────────────────────

const DEFAULT_SEND_TIME_OPTIMISATION = {
  enabled: false,
  minEventsRequired: 5,
}

// ─── Approvals Defaults ─────────────────────────────────────

const DEFAULT_APPROVALS: ApprovalConfig = {
  enabled: false,
  defaultStages: [],
  emailTypeConfigs: [],
  selfServiceRequest: true,
  blockDistributionWithoutApproval: false,
}

// ─── Campaign Insights Defaults ─────────────────────────────

const DEFAULT_CAMPAIGN_INSIGHTS: CampaignInsightsConfig = {
  enabled: true,
  tabs: {
    performance: true,
    prospects: true,
    timing: true,
  },
  showTrendCards: true,
  showKeyInsights: true,
  showRecommendations: true,
}

const DEFAULT_BENCHMARKS: BenchmarksConfig = { enabled: false }
const DEFAULT_AUDIENCE_HEALTH: AudienceHealthConfig = { enabled: false }

// ─── Full Default Settings ──────────────────────────────────

export function createDefaultSettings(): AppSettings {
  return {
    brandThemes: DEFAULT_BRAND_THEMES,
    htmlTemplates: DEFAULT_HTML_TEMPLATES,
    htmlModules: DEFAULT_HTML_MODULES,
    formSteps: DEFAULT_FORM_STEPS,
    formFields: DEFAULT_FORM_FIELDS,
    brandGuardian: DEFAULT_BRAND_GUARDIAN,
    senderDefaults: DEFAULT_SENDER_DEFAULTS,
    formDefaults: DEFAULT_FORM_DEFAULTS,
    legalDisclaimers: DEFAULT_LEGAL_DISCLAIMERS,
    n8nWebhookUrl: '',
    pardot: DEFAULT_PARDOT_CONFIG,
    campaigns: DEFAULT_CAMPAIGNS,
    signoffs: DEFAULT_SIGNOFFS,
    assets: DEFAULT_ASSETS,
    customEmailTypes: [],
    customClientGroups: [],
    customChannels: [],
    customRegions: [],
    audit: {
      enabled: false,
      retentionDays: 90,
      categories: {
        auth: true,
        brief: true,
        kanban: true,
        draft: true,
        settings: true,
        user: true,
        export: true,
      },
    },
    campaignInsights: DEFAULT_CAMPAIGN_INSIGHTS,
    approvals: DEFAULT_APPROVALS,
    sendTimeOptimisation: DEFAULT_SEND_TIME_OPTIMISATION,
    benchmarks: DEFAULT_BENCHMARKS,
    audienceHealth: DEFAULT_AUDIENCE_HEALTH,
    greetings: DEFAULT_GREETINGS,
    notifications: DEFAULT_NOTIFICATIONS,
    rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    userGroups: [],
    headers: DEFAULT_HEADER_TYPES,
  }
}

// ─── Default Header Types ────────────────────────────────────

export const DEFAULT_HEADER_TYPES: HeaderTypeConfig[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Logo, standard-height stripes, headline, and sub-headline',
    requiresHeroImage: false,
    isDefault: true,
    builtIn: true,
    enabled: true,
    htmlSnippet: '',
    assets: {},
    notes: '',
  },
  {
    id: 'standard-bg-image',
    label: 'Standard with Background Image',
    description: 'Full photo background with dark overlay — logo, stripes, headline, and sub-headline over the image',
    requiresHeroImage: true,
    isDefault: false,
    builtIn: true,
    enabled: true,
    htmlSnippet: '',
    assets: {},
    notes: 'Requires a hero image (640 × 270 px recommended). The image is used as the header background with a dark overlay.',
  },
  {
    id: 'slim',
    label: 'Slim',
    description: 'Logo, smaller-height stripes, headline, and sub-headline in a compact header',
    requiresHeroImage: false,
    isDefault: false,
    builtIn: true,
    enabled: true,
    htmlSnippet: '',
    assets: {},
    notes: '',
  },
  {
    id: 'standard-35yr',
    label: 'Standard with 35-Year Logo',
    description: 'Logo, 35-year anniversary graphic, standard stripes, headline, and sub-headline',
    requiresHeroImage: false,
    isDefault: false,
    builtIn: true,
    enabled: true,
    htmlSnippet: '',
    assets: {},
    notes: 'Requires the 35-year graphic asset URL to be configured below.',
  },
  {
    id: 'slim-35yr',
    label: 'Slim with 35-Year Logo',
    description: 'Logo, 35-year anniversary graphic, smaller stripes, headline, and sub-headline',
    requiresHeroImage: false,
    isDefault: false,
    builtIn: true,
    enabled: true,
    htmlSnippet: '',
    assets: {},
    notes: 'Requires the 35-year graphic asset URL to be configured below.',
  },
]

// ─── Default Role Permissions ────────────────────────────────

const ALL_PERMISSION_KEYS: RolePermissionKey[] = [
  'canSubmitBriefs',
  'canViewAllBriefs',
  'canEditAnyBrief',
  'canDeleteBriefs',
  'canViewKanban',
  'canMoveKanbanCards',
  'canDeleteKanbanCards',
  'canViewAnalytics',
  'canManageAssets',
  'canManageTemplates',
  'canExportData',
  'canAccessSettings',
  'canConfigureNotifications',
  'canManageApprovals',
  'canManageUsers',
]

function makePermissions(defaults: Partial<Record<RolePermissionKey, boolean>>): Record<RolePermissionKey, boolean> {
  return Object.fromEntries(
    ALL_PERMISSION_KEYS.map((k) => [k, defaults[k] ?? false])
  ) as Record<RolePermissionKey, boolean>
}

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionConfig = {
  admin: makePermissions(Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true]))),
  producer: makePermissions({
    canSubmitBriefs: true,
    canViewAllBriefs: true,
    canEditAnyBrief: true,
    canDeleteBriefs: false,
    canViewKanban: true,
    canMoveKanbanCards: true,
    canDeleteKanbanCards: true,
    canViewAnalytics: true,
    canManageAssets: true,
    canManageTemplates: true,
    canExportData: true,
    canAccessSettings: true,
    canConfigureNotifications: true,
    canManageApprovals: true,
    canManageUsers: false,
  }),
  requester: makePermissions({
    canSubmitBriefs: true,
    canViewKanban: true,
  }),
}

// ─── Default Notifications ────────────────────────────────────────────────────

const DEFAULT_NOTIFICATION_EVENTS: NotificationEventConfig[] = (
  Object.keys(NOTIFICATION_EVENT_META) as NotificationEventType[]
).map((eventType) => ({
  eventType,
  enabled: false,
  webhookUrl: '',
  subjectTemplate: NOTIFICATION_EVENT_META[eventType].defaultSubject,
  sendToRequester: true,
  sendToTeam: false,
  additionalRecipients: '',
  includeFullPayload: true,
}))

export const DEFAULT_NOTIFICATIONS: NotificationsSettings = {
  enabled: false,
  globalWebhookUrl: '',
  retryOnFailure: true,
  maxRetries: 3,
  logDelivery: true,
  deadlineWarningHours: 48,
  events: DEFAULT_NOTIFICATION_EVENTS,
}
