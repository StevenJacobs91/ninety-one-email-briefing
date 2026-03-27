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
] as const

export type EmailModule = (typeof EMAIL_MODULES)[number]['id']
