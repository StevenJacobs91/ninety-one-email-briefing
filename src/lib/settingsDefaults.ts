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
} from '../types/settings.types'
import { REGION_LEGAL_DISCLAIMERS, REGIONS } from './constants'

// ─── Default Brand Themes ───────────────────────────────────

export const DEFAULT_BRAND_THEMES: BrandThemeConfig[] = [
  { id: 'leatherback-coral', label: 'Leatherback Green / Cape Coral', primary: '#134848', accent: '#fbaa96' },
  { id: 'leatherback-yellowood', label: 'Leatherback Green / Warm Yellowwood', primary: '#134848', accent: '#fcaa28' },
  { id: 'marula-gold', label: 'Marula Green / Gazania Gold', primary: '#0a3323', accent: '#cf6f13' },
  { id: 'marula-coral', label: 'Marula Green / Cape Coral', primary: '#0a3323', accent: '#fbaa96' },
  { id: 'pinotage-coral', label: 'Pinotage Burgundy / Cape Coral', primary: '#591739', accent: '#fbaa96' },
  { id: 'springbok-red', label: 'Springbok Cream / Protea Red', primary: '#e8e5ce', accent: '#d83949' },
  { id: 'springbok-teal', label: 'Springbok Cream / Ocean Teal', primary: '#e8e5ce', accent: '#009d80' },
  { id: 'springbok-burgundy', label: 'Springbok Cream / Pinotage Burgundy', primary: '#e8e5ce', accent: '#591739' },
  { id: 'agulhas-gold', label: 'Agulhas Indigo / Gazania Gold', primary: '#221b3b', accent: '#cf6f13' },
  { id: 'agulhas-teal', label: 'Agulhas Indigo / Ocean Teal', primary: '#221b3b', accent: '#009d80' },
  { id: 'agulhas-red', label: 'Agulhas Indigo / Protea Red', primary: '#221b3b', accent: '#d83949' },
  { id: 'agulhas-coral', label: 'Agulhas Indigo / Cape Coral', primary: '#221b3b', accent: '#fbaa96' },
  { id: 'agulhas-yellowwood', label: 'Agulhas Indigo / Warm Yellowwood', primary: '#221b3b', accent: '#fcaa28' },
  { id: 'galjoen-coral', label: 'Galjoen Gray / Cape Coral', primary: '#74908d', accent: '#fbaa96' },
  { id: 'galjoen-green', label: 'Galjoen Gray / Leatherback Green', primary: '#74908d', accent: '#134848' },
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
  { id: 'audience', label: 'Audience', order: 1, visible: true },
  { id: 'content', label: 'Content', order: 2, visible: true },
  { id: 'assets', label: 'Assets', order: 3, visible: true },
  { id: 'deadlines', label: 'Deadlines', order: 4, visible: true },
]

// ─── Default Form Fields ────────────────────────────────────

export const DEFAULT_FORM_FIELDS: FormFieldConfig[] = [
  // Step 0 — Campaign
  { id: 'campaign.emailType', label: 'Email Type', stepIndex: 0, required: true, visible: true, order: 0 },
  { id: 'campaign.campaignName', label: 'Campaign Name', stepIndex: 0, required: true, visible: true, order: 1 },
  { id: 'campaign.theme', label: 'Brand Theme', stepIndex: 0, required: true, visible: true, order: 2 },
  { id: 'campaign.subjectLine', label: 'Subject Line', stepIndex: 0, required: true, visible: true, order: 3 },
  { id: 'campaign.previewText', label: 'Preview Text', stepIndex: 0, required: true, visible: true, order: 4 },
  { id: 'campaign.fromName', label: 'From Name', stepIndex: 0, required: true, visible: true, order: 5 },
  { id: 'campaign.fromAddress', label: 'From Address', stepIndex: 0, required: true, visible: true, order: 6 },
  { id: 'campaign.replyToEmail', label: 'Reply-To Email', stepIndex: 0, required: false, visible: true, order: 7 },

  // Step 1 — Audience
  { id: 'audience.clientGroup', label: 'Client Group', stepIndex: 1, required: true, visible: true, order: 0 },
  { id: 'audience.region', label: 'Region', stepIndex: 1, required: true, visible: true, order: 1 },
  { id: 'audience.channel', label: 'Channel', stepIndex: 1, required: true, visible: true, order: 2 },
  { id: 'audience.distributionLists', label: 'Distribution Lists', stepIndex: 1, required: false, visible: true, order: 3 },
  { id: 'audience.pardotListId', label: 'Pardot List ID', stepIndex: 1, required: false, visible: true, order: 4 },

  // Step 2 — Content
  { id: 'content.headline', label: 'Headline', stepIndex: 2, required: true, visible: true, order: 0 },
  { id: 'content.bodyIntro', label: 'Body Intro', stepIndex: 2, required: true, visible: true, order: 1 },
  { id: 'content.sections', label: 'Content Sections', stepIndex: 2, required: true, visible: true, order: 2 },
  { id: 'content.modules', label: 'Email Modules', stepIndex: 2, required: false, visible: true, order: 3 },
  { id: 'content.cta', label: 'Call to Action', stepIndex: 2, required: true, visible: true, order: 4 },
  { id: 'content.legalDisclaimer', label: 'Legal Disclaimer', stepIndex: 2, required: false, visible: true, order: 5 },
  { id: 'content.includeUnsubscribe', label: 'Include Unsubscribe', stepIndex: 2, required: false, visible: true, order: 6 },

  // Step 3 — Assets
  { id: 'assets.logoVariant', label: 'Logo Variant', stepIndex: 3, required: true, visible: true, order: 0 },
  { id: 'assets.stripeColour', label: 'Stripe Colour', stepIndex: 3, required: false, visible: true, order: 1 },
  { id: 'assets.heroImageUrl', label: 'Hero Image URL', stepIndex: 3, required: false, visible: true, order: 2 },
  { id: 'assets.heroImageAlt', label: 'Hero Image Alt Text', stepIndex: 3, required: false, visible: true, order: 3 },
  { id: 'assets.additionalAssetUrls', label: 'Additional Asset URLs', stepIndex: 3, required: false, visible: true, order: 4 },
  { id: 'assets.attachments', label: 'Attachments', stepIndex: 3, required: false, visible: true, order: 5 },

  // Step 4 — Deadlines
  { id: 'deadlines.contentApprovalDate', label: 'Content Approval Date', stepIndex: 4, required: true, visible: true, order: 0 },
  { id: 'deadlines.sendDate', label: 'Send Date', stepIndex: 4, required: true, visible: true, order: 1 },
  { id: 'deadlines.urgency', label: 'Urgency', stepIndex: 4, required: true, visible: true, order: 2 },
  { id: 'deadlines.oneOnOneRequired', label: '1-1 Required', stepIndex: 4, required: false, visible: true, order: 3 },
  { id: 'deadlines.notes', label: 'Notes', stepIndex: 4, required: false, visible: true, order: 4 },
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
  businessUnitId: '',
  apiProxyUrl: '',
  instanceUrl: 'https://pi.pardot.com',
}

// ─── Default Campaigns ──────────────────────────────────────

export const DEFAULT_CAMPAIGNS: CampaignEntry[] = [
  { id: 'camp-global-all', name: 'Quarterly Market Update', regions: [], channels: [], clientGroups: [] },
  { id: 'camp-za-int', name: 'SA Intermediary Newsletter', regions: ['South Africa'], channels: ['Advisor'], clientGroups: ['Southern Africa'] },
  { id: 'camp-uk-inst', name: 'UK Institutional Webinar Series', regions: ['United Kingdom'], channels: ['Institutional'], clientGroups: ['United Kingdom'] },
  { id: 'camp-global-inst', name: 'Global Institutional Outlook', regions: [], channels: ['Institutional'], clientGroups: [] },
  { id: 'camp-eu-ret', name: 'EU Retail Fund Update', regions: [], channels: ['Individual Investor'], clientGroups: ['Europe'] },
]

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
]

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
  }
}
