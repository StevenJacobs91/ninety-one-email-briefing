export type BlockType = 'hero' | 'text' | 'image' | 'button' | 'columns' | 'spacer' | 'divider' | 'social' | 'module'
export type Viewport = 'desktop' | 'mobile'
export type SocialPlatform = 'linkedin' | 'twitter' | 'youtube' | 'instagram' | 'facebook'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface HeroBlock extends BaseBlock {
  type: 'hero'
  props: {
    bgColor: string
    bgImageUrl: string
    overlayOpacity: number
    logoVisible: boolean
    heading: string
    subheading: string
    alignment: 'left' | 'center' | 'right'
    paddingY: number
  }
}

export interface TextBlock extends BaseBlock {
  type: 'text'
  props: {
    html: string
    paddingX: number
    paddingY: number
    alignment: 'left' | 'center' | 'right'
    bgColor: string
  }
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  props: {
    src: string
    alt: string
    link: string
    width: number
    alignment: 'left' | 'center' | 'right'
    paddingY: number
  }
}

export interface ButtonBlock extends BaseBlock {
  type: 'button'
  props: {
    label: string
    url: string
    bgColor: string
    textColor: string
    borderRadius: number
    paddingX: number
    paddingY: number
    alignment: 'left' | 'center' | 'right'
    blockPaddingY: number
  }
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns'
  props: {
    columnCount: 2 | 3
    gap: number
    bgColor: string
    paddingY: number
    columns: Array<{
      blocks: Block[]
    }>
  }
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer'
  props: {
    height: number
    bgColor: string
  }
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
  props: {
    color: string
    thickness: number
    paddingY: number
    bgColor: string
    style: 'solid' | 'dashed' | 'dotted'
  }
}

export interface SocialBlock extends BaseBlock {
  type: 'social'
  props: {
    platforms: SocialPlatform[]
    iconStyle: 'filled' | 'outline'
    iconColor: string
    bgColor: string
    paddingY: number
    alignment: 'left' | 'center' | 'right'
  }
}

export interface ModuleBlock extends BaseBlock {
  type: 'module'
  props: {
    moduleId: string
    notes: string
    bgColor: string
  }
}

export type Block = HeroBlock | TextBlock | ImageBlock | ButtonBlock | ColumnsBlock | SpacerBlock | DividerBlock | SocialBlock | ModuleBlock

export interface HeadingStyleDef {
  fontSize: number
  color: string
  fontWeight: 'normal' | 'bold'
}

export interface EmailConfig {
  backgroundColor: string
  backgroundImageUrl: string
  backgroundImageEnabled: boolean
  contentWidth: number
  messageAlignment: 'left' | 'center' | 'right'
  fontFamily: string
  linkColor: string
  underlineLinks: boolean
  responsiveDesign: boolean
  hideImageDownloadIcons: boolean
  subject?: string
  headingStyles: {
    h1: HeadingStyleDef
    h2: HeadingStyleDef
    h3: HeadingStyleDef
  }
  buttonStyles: {
    bgColor: string
    textColor: string
    borderRadius: number
    paddingX: number
    paddingY: number
  }
  stripeStyles: {
    bgColor: string
    paddingY: number
  }
}

export interface BuilderState {
  blocks: Block[]
  selectedBlockId: string | null
  viewport: Viewport
  emailConfig: EmailConfig
  history: Block[][]
  historyIndex: number
}

export type BuilderAction =
  | { type: 'SET_BLOCKS'; blocks: Block[] }
  | { type: 'ADD_BLOCK'; block: Block; afterIndex: number }
  | { type: 'REMOVE_BLOCK'; id: string }
  | { type: 'UPDATE_BLOCK'; id: string; props: Record<string, unknown> }
  | { type: 'MOVE_BLOCK'; fromIndex: number; toIndex: number }
  | { type: 'DUPLICATE_BLOCK'; id: string }
  | { type: 'SELECT_BLOCK'; id: string | null }
  | { type: 'SET_VIEWPORT'; viewport: Viewport }
  | { type: 'SET_EMAIL_CONFIG'; config: Partial<EmailConfig> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_TEMPLATE'; blocks: Block[]; config: EmailConfig }
