import type { Block, EmailConfig } from '../types'
import { createBlock } from './blockDefaults'

export interface BuilderTemplate {
  id: string
  label: string
  description: string
  icon: string
  blocks: Block[]
  config: EmailConfig
}

const DEFAULT_CONFIG: EmailConfig = {
  backgroundColor: '#f4f4f4',
  backgroundImageUrl: '',
  backgroundImageEnabled: false,
  contentWidth: 640,
  messageAlignment: 'center',
  fontFamily: 'Arial, sans-serif',
  linkColor: '#134848',
  underlineLinks: true,
  responsiveDesign: true,
  hideImageDownloadIcons: true,
  headingStyles: {
    h1: { fontSize: 28, color: '#134848', fontWeight: 'bold' },
    h2: { fontSize: 22, color: '#134848', fontWeight: 'bold' },
    h3: { fontSize: 18, color: '#134848', fontWeight: 'bold' },
  },
  buttonStyles: { bgColor: '#fbaa96', textColor: '#134848', borderRadius: 4, paddingX: 32, paddingY: 14 },
  stripeStyles: { bgColor: '#ffffff', paddingY: 0 },
}

function makeHero(heading: string, subheading: string, bgColor = '#134848'): Block {
  const b = createBlock('hero')
  if (b.type === 'hero') {
    b.props.heading = heading
    b.props.subheading = subheading
    b.props.bgColor = bgColor
  }
  return b
}

function makeText(html: string): Block {
  const b = createBlock('text')
  if (b.type === 'text') {
    b.props.html = html
  }
  return b
}

function makeButton(label: string, url = '#', bgColor = '#fbaa96'): Block {
  const b = createBlock('button')
  if (b.type === 'button') {
    b.props.label = label
    b.props.url = url
    b.props.bgColor = bgColor
  }
  return b
}

function makeDivider(): Block {
  return createBlock('divider')
}

function makeSpacer(height = 32): Block {
  const b = createBlock('spacer')
  if (b.type === 'spacer') {
    b.props.height = height
  }
  return b
}

function makeSocial(): Block {
  return createBlock('social')
}

function makeImage(alt = 'Featured image'): Block {
  const b = createBlock('image')
  if (b.type === 'image') {
    b.props.alt = alt
    b.props.src = ''
  }
  return b
}

function makeColumns2(col1Blocks: Block[], col2Blocks: Block[]): Block {
  const b = createBlock('columns')
  if (b.type === 'columns') {
    b.props.columns = [{ blocks: col1Blocks }, { blocks: col2Blocks }]
  }
  return b
}

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Standard newsletter layout with hero, content sections, and social links.',
    icon: '📰',
    config: DEFAULT_CONFIG,
    blocks: [
      makeHero('Ninety One Newsletter', 'The latest insights from our investment teams.'),
      makeText('<h2 style="font-size: 20px; color: #134848; margin-bottom: 12px;">This Month\'s Highlights</h2><p>Welcome to this edition of the Ninety One newsletter. Below you\'ll find our latest market commentary and investment perspectives.</p>'),
      makeDivider(),
      makeText('<h3 style="font-size: 16px; color: #134848; margin-bottom: 8px;">Market Commentary</h3><p>Our portfolio managers share their views on current market conditions and opportunities across asset classes.</p>'),
      makeButton('Read Full Commentary'),
      makeSpacer(16),
      makeDivider(),
      makeSocial(),
      makeSpacer(24),
      makeText('<p style="font-size: 12px; color: #999999; text-align: center;">Ninety One &bull; 55 Water Street, London &bull; <a href="#" style="color: #999999;">Unsubscribe</a></p>'),
    ],
  },
  {
    id: 'event-invitation',
    label: 'Event Invitation',
    description: 'Elegant event invitation with dark hero, speaker details, and CTA.',
    icon: '🎤',
    config: { ...DEFAULT_CONFIG, backgroundColor: '#1a1a2e' },
    blocks: [
      makeHero('You Are Invited', 'Join us for an exclusive investment forum.', '#221b3b'),
      makeText('<p style="text-align: center; font-size: 16px; color: #333;">We are delighted to invite you to our upcoming event. Reserve your place today and hear directly from our investment leaders.</p><p style="text-align: center;"><strong>Date:</strong> Tuesday, 15 April 2026<br/><strong>Time:</strong> 09:00 – 11:00 BST<br/><strong>Location:</strong> The Shard, London</p>'),
      makeButton('Reserve Your Place', '#', '#134848'),
      makeDivider(),
      makeText('<h3 style="font-size: 16px; color: #134848; margin-bottom: 12px; text-align: center;">Featured Speakers</h3><p style="text-align: center; color: #666;">Our expert panel brings decades of experience across global markets.</p>'),
      makeDivider(),
      makeText('<p style="font-size: 12px; color: #999999; text-align: center;">Ninety One &bull; <a href="#" style="color: #999999;">Unsubscribe</a></p>'),
    ],
  },
  {
    id: 'single-article',
    label: 'Single Article',
    description: 'Clean article layout with hero image, body copy, and read more CTA.',
    icon: '📄',
    config: DEFAULT_CONFIG,
    blocks: [
      makeHero('Navigating Emerging Markets', 'A perspective from our portfolio management team.'),
      makeText('<p>Emerging market equities have faced significant headwinds in recent months. Our team examines what this means for long-term investors and where opportunities may lie.</p>'),
      makeImage('Article feature image'),
      makeText('<p>Despite short-term volatility, our analysis points to compelling valuations in select markets. We explore three key themes driving our current positioning:</p><ul><li>Currency dynamics and real interest rate differentials</li><li>Corporate earnings resilience in domestic consumer sectors</li><li>Policy reform momentum in key emerging economies</li></ul>'),
      makeButton('Read the Full Article'),
      makeDivider(),
      makeText('<p style="font-size: 12px; color: #999999; text-align: center;">Ninety One &bull; <a href="#" style="color: #999999;">Unsubscribe</a></p>'),
    ],
  },
  {
    id: 'operational-notice',
    label: 'Operational Notice',
    description: 'Clean, no-hero operational communication for fund or process updates.',
    icon: '📋',
    config: { ...DEFAULT_CONFIG, backgroundColor: '#f9f9f9' },
    blocks: [
      makeText('<p style="text-align: center; padding-top: 24px;"><img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" width="120" style="display: inline-block;" /></p>'),
      makeDivider(),
      makeText('<h2 style="font-size: 18px; color: #134848; margin-bottom: 12px;">Important Fund Update</h2><p>We are writing to inform you of an update to the Ninety One Emerging Markets Equity Fund. Please read the following information carefully.</p>'),
      makeDivider(),
      makeText('<h3 style="font-size: 15px; color: #134848; margin-bottom: 8px;">What is changing?</h3><p>From 1 May 2026, the fund\'s benchmark will be updated to reflect the revised MSCI Emerging Markets Index composition.</p>'),
      makeText('<h3 style="font-size: 15px; color: #134848; margin-bottom: 8px;">Do you need to take action?</h3><p>No action is required from investors at this time. Your holdings will continue to be managed in line with the fund\'s stated objectives.</p>'),
      makeDivider(),
      makeText('<p style="font-size: 12px; color: #999999; text-align: center;">This is a regulated communication from Ninety One. &bull; <a href="#" style="color: #999999;">Unsubscribe</a></p>'),
    ],
  },
  {
    id: 'campaign-announcement',
    label: 'Campaign Announcement',
    description: 'Impact-led campaign with two-column content grid and social footer.',
    icon: '🚀',
    config: DEFAULT_CONFIG,
    blocks: [
      makeHero('Introducing Our New Strategy', 'Designed for the world as it is, not as it was.', '#134848'),
      makeText('<p style="text-align: center; font-size: 16px;">We are excited to announce the launch of our latest investment strategy. Built around three core pillars, it is designed to deliver resilient returns across market cycles.</p>'),
      makeColumns2(
        [
          makeImage('Column 1 image'),
          makeText('<h3 style="font-size: 14px; color: #134848;">Quality at Core</h3><p style="font-size: 13px;">Focused on businesses with durable competitive advantages and strong cash generation.</p>'),
          makeButton('Learn More', '#', '#fbaa96'),
        ],
        [
          makeImage('Column 2 image'),
          makeText('<h3 style="font-size: 14px; color: #134848;">ESG Integration</h3><p style="font-size: 13px;">Sustainability considerations are embedded throughout our investment process.</p>'),
          makeButton('Learn More', '#', '#fbaa96'),
        ]
      ),
      makeDivider(),
      makeSocial(),
      makeText('<p style="font-size: 12px; color: #999999; text-align: center;">Ninety One &bull; <a href="#" style="color: #999999;">Unsubscribe</a></p>'),
    ],
  },
]
