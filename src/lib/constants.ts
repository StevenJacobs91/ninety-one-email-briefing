export const EMAIL_TYPES = [
  'campaign',
  'newsletter',
  'fund-update',
  'event-invitation',
  'thought-leadership',
  'client-announcement',
] as const

export type EmailType = (typeof EMAIL_TYPES)[number]

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  campaign: 'Campaign',
  newsletter: 'Newsletter',
  'fund-update': 'Fund Update',
  'event-invitation': 'Event Invitation',
  'thought-leadership': 'Thought Leadership',
  'client-announcement': 'Client Announcement',
}

export const BRAND_THEMES = [
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
] as const

export type BrandTheme = (typeof BRAND_THEMES)[number]['id']

export const CLIENT_GROUPS = ['Southern Africa', 'United Kingdom', 'Europe', 'Northern America', 'Asia'] as const
export const REGIONS = ['South Africa', 'Namibia', 'Botswana'] as const
export const CHANNELS = ['Advisor', 'Institutional', 'Corporate Solutions', 'Individual Investor', 'Internal'] as const

export type ClientGroup = (typeof CLIENT_GROUPS)[number]
export type Region = (typeof REGIONS)[number]
export type Channel = (typeof CHANNELS)[number]

export const LOGO_VARIANTS = ['horizontal', 'stacked', 'icon'] as const
export const URGENCY_OPTIONS = ['standard', 'urgent'] as const

/** All available email template modules from the Themes and Modules library */
export const EMAIL_MODULES = [
  { id: 'header-small', label: 'Small Header', description: 'Logo with headline and subtitle', category: 'Headers' },
  { id: 'header-image', label: 'Header with Background Image', description: 'Full-width hero image with overlay text', category: 'Headers' },
  { id: 'greeting', label: 'Greeting / Salutation', description: 'Personalised greeting with Pardot merge fields', category: 'Headers' },
  { id: 'body-content', label: 'Body Content', description: 'Standard paragraph text block', category: 'Content' },
  { id: 'body-content-list', label: 'Body Content with Bullet List', description: 'Dash-separated key points list', category: 'Content' },
  { id: 'body-inner-content', label: 'Inner Content Block', description: 'Tinted background content card with heading', category: 'Content' },
  { id: 'inner-content-v1', label: 'Inner Content with Link CTA', description: 'Content card with inline tertiary link CTA', category: 'Content' },
  { id: 'inner-content-v2', label: 'Inner Content with Dash List', description: 'Tinted card with heading/body dash list items', category: 'Content' },
  { id: 'inner-content-v3', label: 'Feedback / Survey Block', description: 'Content block with secondary CTA button', category: 'Content' },
  { id: 'numbered-section-v1', label: 'Numbered Section (Flat)', description: 'Numbered list items on primary background', category: 'Content' },
  { id: 'numbered-section-v2', label: 'Numbered Section (Card)', description: 'Numbered list items in tinted card', category: 'Content' },
  { id: 'podcast', label: 'Podcast Module', description: 'Spotify + Apple Podcasts badges with description', category: 'Media' },
  { id: 'video-rollover', label: 'Video Play Rollover', description: 'Image with play button overlay linking to video', category: 'Media' },
  { id: 'cta-single-primary', label: 'Single Primary CTA', description: 'One accent-coloured action button', category: 'CTAs' },
  { id: 'cta-primary-secondary', label: 'Primary + Secondary CTA', description: 'Primary button with outlined secondary button', category: 'CTAs' },
  { id: 'cta-dual-secondary', label: 'Dual Secondary CTAs', description: 'Two outlined secondary buttons side by side', category: 'CTAs' },
  { id: 'cta-single-secondary', label: 'Single Secondary CTA', description: 'One outlined secondary button', category: 'CTAs' },
  { id: 'cta-1primary-2secondary', label: '1 Primary + 2 Secondary CTAs', description: 'Primary button with two secondary buttons', category: 'CTAs' },
  { id: 'event-registration-1cta', label: 'Event Registration (1 CTA)', description: 'Event details with date, time, venue and register button', category: 'Events' },
  { id: 'event-registration-2cta', label: 'Event Registration (2 CTAs)', description: 'Event details with two registration buttons', category: 'Events' },
  { id: 'event-registration-v3', label: 'Event Registration (Compact)', description: 'Compact event details with speaker list', category: 'Events' },
  { id: 'event-registration-v4', label: 'Event Registration (Card)', description: 'Event details in tinted card layout', category: 'Events' },
  { id: 'event-registration-v5', label: 'Event Registration (Full)', description: 'Full event layout with agenda and speakers', category: 'Events' },
  { id: 'itinerary-table', label: 'Itinerary / Agenda Table', description: 'Time-slot table for event schedules', category: 'Events' },
  { id: 'speaker-2pm-1cta', label: '2 Portfolio Managers + 1 CTA', description: 'Two PM profiles with shared CTA button', category: 'Speakers' },
  { id: 'speaker-2pm-3cta', label: '2 Portfolio Managers + 3 CTAs', description: 'Two PM profiles with individual CTAs', category: 'Speakers' },
  { id: 'speaker-1pm', label: 'Single Portfolio Manager', description: 'Single PM profile with bio and photo', category: 'Speakers' },
  { id: 'speakers-2col', label: 'Speakers (2 Column)', description: 'Two speaker cards side by side', category: 'Speakers' },
  { id: 'speakers-3col', label: 'Speakers (3 Column)', description: 'Three speaker cards in a row', category: 'Speakers' },
  { id: 'article-list-v1', label: 'Article List (Standard)', description: 'Stacked article cards with thumbnails', category: 'Articles' },
  { id: 'article-list-v2', label: 'Article List (Compact)', description: 'Compact article list with small thumbnails', category: 'Articles' },
  { id: 'article-list-v3', label: 'Article List (Featured)', description: 'Featured article with large image and supporting articles', category: 'Articles' },
  { id: 'gallery-v1', label: 'Image Gallery (2 Column)', description: 'Two images side by side', category: 'Media' },
  { id: 'gallery-v2', label: 'Image Gallery (3 Column)', description: 'Three images in a row', category: 'Media' },
  { id: 'tabs-main', label: 'Main Tab Navigation', description: 'Tabbed navigation buttons for anchored sections', category: 'Navigation' },
  { id: 'tabs-anchors', label: 'Tab Anchor Links', description: 'Inline anchor links for content navigation', category: 'Navigation' },
  { id: 'footer-v1', label: 'Footer (Standard)', description: 'Logo, website link, privacy notice', category: 'Footers' },
  { id: 'footer-v2', label: 'Footer (Compact)', description: 'Compact footer with three inline links', category: 'Footers' },
  { id: 'footer-v3', label: 'Footer (Contact Details)', description: 'Full footer with team contact information', category: 'Footers' },
] as const

export type EmailModule = (typeof EMAIL_MODULES)[number]['id']

// ─── Brief Templates ─────────────────────────────────────────────────────────

export interface BriefTemplate {
  id: string
  label: string
  description: string
  icon: string
  emailType: EmailType
  suggestedTheme: string
  suggestedModules: string[]
  sectionScaffold: Array<{ heading: string; body: string }>
  ctaLabel: string
  includeUnsubscribe: boolean
}

export const BRIEF_TEMPLATES: BriefTemplate[] = [
  {
    id: 'tpl-campaign',
    label: 'Campaign',
    description: 'General marketing campaign with hero image, body content and a clear CTA.',
    icon: '📣',
    emailType: 'campaign',
    suggestedTheme: 'leatherback-coral',
    suggestedModules: ['header-image', 'body-content', 'cta-single-primary', 'footer-v1'],
    sectionScaffold: [
      { heading: 'Key Message', body: 'Describe the core value proposition or campaign message here.' },
    ],
    ctaLabel: 'Learn More',
    includeUnsubscribe: true,
  },
  {
    id: 'tpl-newsletter',
    label: 'Newsletter',
    description: 'Monthly or quarterly newsletter with multiple content sections and article links.',
    icon: '📰',
    emailType: 'newsletter',
    suggestedTheme: 'leatherback-coral',
    suggestedModules: ['header-small', 'greeting', 'body-content', 'article-list-v1', 'cta-single-secondary', 'footer-v1'],
    sectionScaffold: [
      { heading: 'Market Update', body: 'Provide a brief summary of recent market conditions and outlook.' },
      { heading: 'Featured Insights', body: 'Highlight key articles, reports or research pieces.' },
    ],
    ctaLabel: 'Read More',
    includeUnsubscribe: true,
  },
  {
    id: 'tpl-fund-update',
    label: 'Fund Update',
    description: 'Performance update for a specific fund with key metrics and portfolio commentary.',
    icon: '📈',
    emailType: 'fund-update',
    suggestedTheme: 'marula-gold',
    suggestedModules: ['header-small', 'body-content', 'body-inner-content', 'cta-primary-secondary', 'footer-v2'],
    sectionScaffold: [
      { heading: 'Fund Performance', body: 'Summarise fund performance over the period, including key metrics and benchmark comparison.' },
      { heading: 'Portfolio Commentary', body: 'Describe portfolio positioning, key holdings and any significant changes during the period.' },
      { heading: 'Outlook', body: 'Provide the portfolio manager\'s forward-looking view and investment thesis.' },
    ],
    ctaLabel: 'View Fund Factsheet',
    includeUnsubscribe: true,
  },
  {
    id: 'tpl-event-invitation',
    label: 'Event Invitation',
    description: 'Webinar, roadshow or in-person event invitation with registration CTA.',
    icon: '🎟️',
    emailType: 'event-invitation',
    suggestedTheme: 'agulhas-teal',
    suggestedModules: ['header-image', 'event-registration-1cta', 'speaker-2pm-1cta', 'footer-v1'],
    sectionScaffold: [
      { heading: 'About This Event', body: 'Describe the event format, topics to be covered and why attendees should register.' },
    ],
    ctaLabel: 'Register Now',
    includeUnsubscribe: true,
  },
  {
    id: 'tpl-thought-leadership',
    label: 'Thought Leadership',
    description: 'In-depth article, white paper or research piece driving to a content asset.',
    icon: '💡',
    emailType: 'thought-leadership',
    suggestedTheme: 'agulhas-gold',
    suggestedModules: ['header-image', 'body-content', 'body-inner-content', 'cta-single-primary', 'footer-v1'],
    sectionScaffold: [
      { heading: 'The Opportunity', body: 'Introduce the key investment theme or market insight being explored.' },
      { heading: 'Our Perspective', body: 'Share Ninety One\'s unique view and supporting rationale.' },
    ],
    ctaLabel: 'Read the Report',
    includeUnsubscribe: true,
  },
  {
    id: 'tpl-client-announcement',
    label: 'Client Announcement',
    description: 'Important news, product change or regulatory update communicated to clients.',
    icon: '📢',
    emailType: 'client-announcement',
    suggestedTheme: 'leatherback-coral',
    suggestedModules: ['header-small', 'body-content', 'footer-v2'],
    sectionScaffold: [
      { heading: 'What Is Changing', body: 'Clearly state the change, effective date and any action required from the client.' },
      { heading: 'Why This Change', body: 'Provide context and rationale for the change.' },
      { heading: 'What This Means For You', body: 'Explain the practical impact on the client and any next steps.' },
    ],
    ctaLabel: 'Contact Us',
    includeUnsubscribe: false,
  },
]

export const REGION_LEGAL_DISCLAIMERS: Record<string, string> = {
  'South Africa': 'Ninety One SA (Pty) Ltd is an authorised financial services provider (FSP No. 19224). This communication is for informational purposes only and does not constitute financial advice. Collective investment schemes are generally medium to long-term investments.',
  'Namibia': 'Ninety One Namibia (Pty) Ltd is registered and incorporated in Namibia (Registration No. 2016/0566) and is licensed as a Financial Services Provider under NAMFISA. This communication is for informational purposes only.',
  'Botswana': 'Ninety One Botswana (Pty) Ltd is licensed by the Non-Bank Financial Institutions Regulatory Authority (NBFIRA). This communication is for informational purposes only and does not constitute investment advice.',
  'UK': 'Ninety One UK Limited is authorised and regulated by the Financial Conduct Authority (FRN 183798). This communication is directed at professional clients and eligible counterparties only. Not for retail distribution.',
  'EU': 'Ninety One Luxembourg S.A. is authorised and regulated by the Commission de Surveillance du Secteur Financier (CSSF). This communication is directed at professional clients only as defined by MiFID II.',
  'ASIA': 'This communication is for institutional investors only and is not intended for retail investors. Recipients should seek their own legal, regulatory, tax and financial advice.',
  'GLOBAL': 'This communication is intended for professional and institutional investors only. Not for distribution to retail investors. Please refer to the relevant fund documentation for full risk disclosures.',
}
