// ─── Design Briefing Types ───────────────────────────────────

export const DESIGN_ASSET_TYPE_IDS = [
  'advertisement',
  'application-form',
  'branded-item',
  'digital-screen',
  'outlook-email-banner',
  'eventogy-banners',
  'event-related',
  'gif',
  'image-resize',
  'infographic',
  'moodboard',
  'newsletter',
  'pdf-document',
  'presentation',
  'social-carousel',
  'social-static',
  'staff-image',
  'svgs',
  'website-graphic',
  'word-document',
  'zoom-banner',
  'other',
] as const

export type DesignAssetTypeId = typeof DESIGN_ASSET_TYPE_IDS[number]

export type DesignFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'date'
  | 'toggle'
  | 'radio'
  | 'theme'
  | 'image-uploader'
  | 'attachments'
  | 'dimensions'
  | 'multi-select'

export interface DesignFieldDef {
  id: string
  type: DesignFieldType
  label: string
  placeholder?: string
  helpText?: string
  required?: boolean
  options?: { value: string; label: string }[]
  conditionalOn?: { field: string; values: string[] }
  maxLength?: number
  rows?: number
}

export interface DesignAssetTypeDef {
  id: DesignAssetTypeId
  label: string
  emoji: string
  color: string
  description: string
  fields: DesignFieldDef[]
}

export interface DesignAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  url: string        // object URL (local) or external URL
  isExternal: boolean
}

export interface DesignMockup {
  id: string
  url: string
  label: string
}

// Flat payload — all asset-specific fields are optional
export interface DesignBriefMeta {
  briefId: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'submitted'
}

export interface DesignBriefPayload {
  meta: DesignBriefMeta
  assetType: DesignAssetTypeId
  projectName: string
  requesterName: string
  requesterEmail: string
  dueDate: string
  urgency: 'standard' | 'urgent'
  colourTheme?: string
  briefNotes?: string
  // Advertisement
  adLocation?: string
  adFormat?: string
  dimensions?: string
  targetAudience?: string
  qrCodeRequired?: boolean
  copy?: string
  // Branded Item
  itemType?: string
  supplierTemplate?: string
  printMethod?: string
  brandingDesired?: string
  // Screens / banners / eventogy
  orientation?: string
  headlineCopy?: string
  // Event
  eventType?: string
  eventDate?: string
  venue?: string
  audience?: string
  // GIF
  gifPlacement?: string[]
  duration?: string
  fileSizeLimitEnabled?: boolean
  fileSizeLimit?: string
  // Image Resize
  resizeWidth?: string
  resizeHeight?: string
  platform?: string
  croppingGuidance?: string
  addBranding?: string
  // Infographic
  dataSource?: string
  complexity?: string
  infographicOrientation?: string
  chartsRequired?: boolean
  infographicAudience?: string
  // Attachments & images
  attachments: DesignAttachment[]
  imageUrls: string[]
  mockups: DesignMockup[]
}

// Form data type (matches payload minus meta + attachments/imageUrls/mockups managed in local state)
export type DesignBriefFormData = Omit<DesignBriefPayload, 'meta' | 'attachments' | 'imageUrls' | 'mockups'>

// Settings types for per-field visibility/ordering
export interface DesignFieldSettings {
  id: string
  visible: boolean
  order: number
}

export type DesignFieldSettingsMap = Record<string, DesignFieldSettings>
