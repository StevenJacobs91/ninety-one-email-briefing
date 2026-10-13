import type { DesignAssetTypeDef, DesignAssetTypeId } from '../types/design.types'

// ─── Asset Type Metadata ─────────────────────────────────────

export const ASSET_TYPE_META: Record<DesignAssetTypeId, { label: string; emoji: string; color: string; description: string }> = {
  'advertisement':        { label: 'Advertisement',          emoji: '📢', color: '#e74c3c', description: 'Print or digital ads with copy, format and QR codes' },
  'application-form':     { label: 'Application Form',       emoji: '📋', color: '#3498db', description: 'Forms with mark-up guidance for revisions' },
  'branded-item':         { label: 'Branded Item',           emoji: '🎁', color: '#9b59b6', description: 'Merchandise, promotional items and corporate gifts' },
  'digital-screen':       { label: 'Digital Screen',         emoji: '🖥️', color: '#1abc9c', description: 'Portrait or landscape digital display graphics' },
  'outlook-email-banner': { label: 'Outlook Email Banner',   emoji: '✉️', color: '#2980b9', description: 'Email signature banners for Outlook' },
  'eventogy-banners':     { label: 'Eventogy Banners',       emoji: '🎪', color: '#e67e22', description: 'Event platform promotional banners' },
  'event-related':        { label: 'Event-Related',          emoji: '📅', color: '#27ae60', description: 'All collateral for events and conferences' },
  'gif':                  { label: 'GIF',                    emoji: '🎬', color: '#f39c12', description: 'Animated GIFs for social, email or web' },
  'image-resize':         { label: 'Image Resize',           emoji: '✂️', color: '#7f8c8d', description: 'Crop and resize existing images for new platforms' },
  'infographic':          { label: 'Infographic',            emoji: '📊', color: '#16a085', description: 'Data-driven visual stories and charts' },
  'moodboard':            { label: 'Moodboard',              emoji: '🎨', color: '#8e44ad', description: 'Visual direction and inspiration boards' },
  'newsletter':           { label: 'Newsletter',             emoji: '📰', color: '#2c3e50', description: 'Print or digital newsletter design' },
  'pdf-document':         { label: 'PDF Document',           emoji: '📄', color: '#c0392b', description: 'Branded PDF documents and reports' },
  'presentation':         { label: 'Presentation',           emoji: '📑', color: '#2980b9', description: 'PowerPoint or Keynote decks' },
  'social-carousel':      { label: 'Social Carousel',        emoji: '🖼️', color: '#e91e8c', description: 'Multi-frame carousel posts for social media' },
  'social-static':        { label: 'Social Static',          emoji: '📷', color: '#c0392b', description: 'Single-image posts for social media' },
  'staff-image':          { label: 'Staff Image',            emoji: '👤', color: '#34495e', description: 'Profile photos, headshots and team portraits' },
  'svgs':                 { label: 'SVGs (Icons/Illustrations)', emoji: '✏️', color: '#1abc9c', description: 'Scalable icons and custom illustrations' },
  'website-graphic':      { label: 'Website Graphic',        emoji: '🌐', color: '#3498db', description: 'On-site hero images, banners and icons' },
  'word-document':        { label: 'Word Document',          emoji: '📝', color: '#2980b9', description: 'Branded Word templates and documents' },
  'zoom-banner':          { label: 'Zoom Banner',            emoji: '🎥', color: '#2d8cff', description: 'Virtual meeting backgrounds and banners' },
  'other':                { label: 'Other',                  emoji: '💡', color: '#95a5a6', description: 'Anything not listed above' },
}

// ─── Asset Type Field Definitions ────────────────────────────

export const DESIGN_ASSET_TYPES: DesignAssetTypeDef[] = [
  // ── Advertisement ──────────────────────────────────────────
  {
    id: 'advertisement',
    ...ASSET_TYPE_META['advertisement'],
    fields: [
      { id: 'briefNotes',       type: 'textarea',     label: 'Brief notes', rows: 4 },
      { id: 'adLocation',       type: 'text',         label: 'Where will the ad appear?' },
      { id: 'adFormat',         type: 'select',       label: 'Ad format', options: [{ value: 'print', label: 'Print' }, { value: 'digital', label: 'Digital' }] },
      { id: 'dimensions',       type: 'text',         label: 'Dimensions / sizes' },
      { id: 'targetAudience',   type: 'text',         label: 'Target audience' },
      { id: 'qrCodeRequired',   type: 'toggle',       label: 'QR code required?', helpText: 'Please add your QR code in SVG format in the attachments box below.' },
      { id: 'copy',             type: 'textarea',     label: 'Copy', helpText: 'Headline, body, disclaimers', rows: 6 },
      { id: 'attachments',      type: 'attachments',  label: 'Attachments' },
      { id: 'colourTheme',      type: 'theme',        label: 'Colour theme' },
    ],
  },

  // ── Application Form ───────────────────────────────────────
  {
    id: 'application-form',
    ...ASSET_TYPE_META['application-form'],
    fields: [
      { id: 'briefNotes',  type: 'textarea',    label: 'Brief notes', helpText: "Please ensure all needs are described. We'd prefer changes to existing forms be marked-up on the PDFs and attached below.", rows: 5 },
      { id: 'attachments', type: 'attachments', label: 'Attachments' },
    ],
  },

  // ── Branded Item ───────────────────────────────────────────
  {
    id: 'branded-item',
    ...ASSET_TYPE_META['branded-item'],
    fields: [
      { id: 'itemType',         type: 'text',         label: 'Item type', placeholder: 'e.g. pen, notebook, tote bag' },
      { id: 'supplierTemplate', type: 'radio',        label: 'Supplier template?', options: [{ value: 'yes-attach', label: "Yes I'll attach it" }, { value: 'will-ask', label: "I'll ask for it" }, { value: 'no', label: 'No' }] },
      { id: 'printMethod',      type: 'text',         label: 'Print method', placeholder: 'e.g. engraving, screen print, embroidery' },
      { id: 'brandingDesired',  type: 'text',         label: 'Branding desired', placeholder: 'e.g. logos, stripes' },
      { id: 'attachments',      type: 'attachments',  label: 'Attachments' },
      { id: 'colourTheme',      type: 'theme',        label: 'Colour theme' },
      { id: 'imageUrls',        type: 'image-uploader', label: 'Reference image' },
      { id: 'briefNotes',       type: 'textarea',     label: 'Brief notes', helpText: "Send us a message and describe everything that's not already captured. How can we help you?" },
    ],
  },

  // ── Digital Screen ─────────────────────────────────────────
  {
    id: 'digital-screen',
    ...ASSET_TYPE_META['digital-screen'],
    fields: [
      { id: 'orientation',  type: 'radio',        label: 'Orientation', options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }, { value: 'both', label: 'Both' }] },
      { id: 'headlineCopy', type: 'textarea',     label: 'Headline & copy', rows: 4 },
      { id: 'attachments',  type: 'attachments',  label: 'Attachments' },
      { id: 'colourTheme',  type: 'theme',        label: 'Colour theme' },
      { id: 'imageUrls',    type: 'image-uploader', label: 'Images' },
      { id: 'briefNotes',   type: 'textarea',     label: 'Brief notes', helpText: "Send us a message and describe everything that's not already captured. How can we help you?" },
    ],
  },

  // ── Outlook Email Banner ────────────────────────────────────
  {
    id: 'outlook-email-banner',
    ...ASSET_TYPE_META['outlook-email-banner'],
    fields: [
      { id: 'headlineCopy', type: 'textarea',     label: 'Headline & copy', rows: 4 },
      { id: 'attachments',  type: 'attachments',  label: 'Attachments' },
      { id: 'colourTheme',  type: 'theme',        label: 'Colour theme' },
      { id: 'imageUrls',    type: 'image-uploader', label: 'Images' },
      { id: 'briefNotes',   type: 'textarea',     label: 'Brief notes', helpText: "Is there a reference you'd like to include?" },
    ],
  },

  // ── Eventogy Banners ───────────────────────────────────────
  {
    id: 'eventogy-banners',
    ...ASSET_TYPE_META['eventogy-banners'],
    fields: [
      { id: 'headlineCopy', type: 'textarea',     label: 'Headline & copy', rows: 4 },
      { id: 'colourTheme',  type: 'theme',        label: 'Colour theme' },
      { id: 'imageUrls',    type: 'image-uploader', label: 'Images', helpText: 'Leave blank if designer can choose' },
      { id: 'briefNotes',   type: 'textarea',     label: 'Brief notes', helpText: 'Is there an image direction for us to take?' },
      { id: 'attachments',  type: 'attachments',  label: 'Attachments' },
    ],
  },

  // ── Event-Related ──────────────────────────────────────────
  {
    id: 'event-related',
    ...ASSET_TYPE_META['event-related'],
    fields: [
      { id: 'eventType',   type: 'text',         label: 'Event type', placeholder: 'e.g. conference, webinar, internal' },
      { id: 'eventDate',   type: 'date',         label: 'Event date' },
      { id: 'venue',       type: 'text',         label: 'Venue / location' },
      { id: 'audience',    type: 'text',         label: 'Audience' },
      { id: 'colourTheme', type: 'theme',        label: 'Colour theme' },
      { id: 'imageUrls',   type: 'image-uploader', label: 'Images', helpText: 'Leave blank if designer can choose' },
      { id: 'briefNotes',  type: 'textarea',     label: 'Brief notes', helpText: "Describe everything you're needing, event collateral needed, etc." },
      { id: 'attachments', type: 'attachments',  label: 'Attachments' },
    ],
  },

  // ── GIF ────────────────────────────────────────────────────
  {
    id: 'gif',
    ...ASSET_TYPE_META['gif'],
    fields: [
      { id: 'gifPlacement',        type: 'multi-select',  label: 'Where will the GIF live?', options: [{ value: 'social', label: 'Social' }, { value: 'email', label: 'Email' }, { value: 'web', label: 'Web' }] },
      { id: 'dimensions',          type: 'text',          label: 'Dimensions' },
      { id: 'duration',            type: 'text',          label: 'Duration / loop preference' },
      { id: 'fileSizeLimitEnabled', type: 'toggle',       label: 'File size limit required?' },
      { id: 'fileSizeLimit',       type: 'text',          label: 'Maximum file size', conditionalOn: { field: 'fileSizeLimitEnabled', values: ['true'] } },
      { id: 'briefNotes',          type: 'textarea',      label: 'Brief notes', helpText: 'Describe the animation and how we can help' },
      { id: 'audience',            type: 'text',          label: 'Audience' },
      { id: 'colourTheme',         type: 'theme',         label: 'Colour theme' },
      { id: 'imageUrls',           type: 'image-uploader', label: 'Images', helpText: 'Leave blank if designer can choose' },
      { id: 'attachments',         type: 'attachments',   label: 'Attachments' },
    ],
  },

  // ── Image Resize ───────────────────────────────────────────
  {
    id: 'image-resize',
    ...ASSET_TYPE_META['image-resize'],
    fields: [
      { id: 'dimensions',       type: 'dimensions',   label: 'Required size', helpText: 'Width × Height in pixels' },
      { id: 'platform',         type: 'text',         label: 'Platform', placeholder: 'e.g. web, email, social, magazine' },
      { id: 'croppingGuidance', type: 'text',         label: 'Cropping guidance', placeholder: 'Describe the focus area' },
      { id: 'addBranding',      type: 'radio',        label: 'Add branding?', options: [{ value: 'logo', label: 'Logo' }, { value: 'stripes', label: 'Stripes' }, { value: 'both', label: 'Both' }, { value: 'none', label: 'None' }] },
      { id: 'colourTheme',      type: 'theme',        label: 'Colour theme', conditionalOn: { field: 'addBranding', values: ['logo', 'stripes', 'both'] } },
      { id: 'attachments',      type: 'attachments',  label: 'Attachments', helpText: 'Upload the original image here' },
    ],
  },

  // ── Infographic ────────────────────────────────────────────
  {
    id: 'infographic',
    ...ASSET_TYPE_META['infographic'],
    fields: [
      { id: 'attachments',           type: 'attachments',  label: 'Attachments', helpText: 'Upload your final copy here' },
      { id: 'dataSource',            type: 'text',         label: 'Data source', placeholder: 'e.g. Excel, Word doc' },
      { id: 'complexity',            type: 'radio',        label: 'Level of complexity', options: [{ value: 'simple', label: 'Simple' }, { value: 'detailed', label: 'Detailed' }] },
      { id: 'infographicOrientation',type: 'radio',        label: 'Orientation', options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }, { value: 'scroll', label: 'Scroll' }] },
      { id: 'chartsRequired',        type: 'toggle',       label: 'Charts required?' },
      { id: 'infographicAudience',   type: 'select',       label: 'Audience', options: [{ value: 'retail', label: 'Retail' }, { value: 'institutional', label: 'Institutional' }, { value: 'internal', label: 'Internal' }] },
    ],
  },

  // ── Generic types (moodboard, newsletter, pdf-document, presentation,
  //    social-carousel, social-static, staff-image, svgs, website-graphic,
  //    word-document, zoom-banner, other) — share same 3-field schema
  ...(['moodboard', 'newsletter', 'pdf-document', 'presentation', 'social-carousel', 'social-static', 'staff-image', 'svgs', 'website-graphic', 'word-document', 'zoom-banner', 'other'] as const).map((id) => ({
    id,
    ...ASSET_TYPE_META[id],
    fields: [
      { id: 'briefNotes',  type: 'textarea' as const,    label: 'Brief notes', placeholder: 'Describe how we can help you.', rows: 5 },
      { id: 'colourTheme', type: 'theme' as const,       label: 'Colour theme' },
      { id: 'attachments', type: 'attachments' as const, label: 'Attachments' },
    ],
  })),
]
