import { z } from 'zod'
import { LOGO_VARIANTS, SENDER_TYPES, URGENCY_OPTIONS } from './constants'

const contentSectionSchema = z.object({
  id: z.string(),
  heading: z.string().max(60, 'Max 60 characters'),
  body: z.string().max(500, 'Max 500 characters'),
  imageRequired: z.boolean(),
  imageDescription: z.string().optional(),
})

const ctaSchema = z.object({
  // No hard limit: a long label is a Brand Review suggestion, and the button can be made wider to hold it.
  label: z.string(),
  url: z.string().url('Must be a valid URL').or(z.literal('')),
  openInNewTab: z.boolean(),
})

const metaSchema = z.object({
  briefId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['draft', 'submitted']),
})

const campaignSchema = z.object({
  emailDescription: z.string().max(80, 'Max 80 characters').optional().default(''),
  emailType: z.string().min(1, 'Email type is required'),
  campaignName: z.string().min(1, 'Campaign name is required'),
  theme: z.string().min(1, 'Theme is required'),
  subjectLine: z.string().min(1, 'Subject line is required'),
  previewText: z.string().min(1, 'Preview text is required'),
  /** Who the email is sent as in Pardot. Briefs saved before this existed are general-user sends. */
  senderType: z.enum(SENDER_TYPES).optional().default('general'),
  /** The Pardot user a specific-user send comes from (their user ID) */
  specificUser: z.string().optional().default(''),
  fromName: z.string().min(1, 'From name is required'),
  fromAddress: z.string().email('Must be a valid email address'),
  replyToEmail: z.string().email('Must be a valid email address').or(z.literal('')).optional(),
  utmCampaign: z.string().optional(),
})

const distributionListSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  /** Total clean contacts after deduplication and filtering */
  rowCount: z.number().optional(),
  /** UTF-8 CSV string of the cleaned list — 5 columns only */
  csvContent: z.string().optional(),
  /** Summary stats for the List Analysis panel */
  analysis: z.object({
    rawRowCount: z.number(),
    cleanRowCount: z.number(),
    blankEmailCount: z.number(),
    unknownEmailCount: z.number(),
    duplicateCount: z.number(),
    blankRowCount: z.number(),
    discardedColumns: z.array(z.string()),
    warnings: z.array(z.string()),
  }).optional(),
})

const audienceSchema = z.object({
  clientGroup: z.array(z.string()).min(1, 'Select at least one client group'),
  region: z.array(z.string()).min(1, 'Select at least one region'),
  channel: z.array(z.string()).min(1, 'Select at least one channel'),
  pardotListId: z.string().optional(),
  /** Supports multiple distribution list uploads — each processed independently */
  distributionLists: z.array(distributionListSchema).optional(),
})

const buildModuleSchema = z.object({
  instanceId: z.string(),
  moduleName: z.string(),
  slot: z.enum(['header', 'body', 'disclaimer', 'footer']).nullable(),
  repeats: z.record(z.number()),
  regions: z.record(z.object({ value: z.string().optional(), href: z.string().optional(), alt: z.string().optional(), removed: z.boolean().optional() })),
  images: z.record(z.object({ src: z.string().optional(), alt: z.string().optional() })),
  boundFields: z.record(z.string()),
  disclaimerHtml: z.string().optional(),
  buttonWidths: z.record(z.array(z.number())).optional(),
  footer: z.object({
    removeSignoff: z.boolean().optional(),
    signature: z.union([z.literal('none'), z.object({ entry: z.object({ id: z.string(), name: z.string(), text: z.string(), isDefault: z.boolean(), columns: z.union([z.literal(1), z.literal(2)]).optional(), textRight: z.string().optional(), format: z.enum(['text', 'code']).optional() }) })]).optional(),
    social: z.boolean().optional(),
  }).optional(),
  styles: z.record(z.object({ margin: z.object({ top: z.string().optional(), right: z.string().optional(), bottom: z.string().optional(), left: z.string().optional() }).optional(), padding: z.object({ top: z.string().optional(), right: z.string().optional(), bottom: z.string().optional(), left: z.string().optional() }).optional(), class: z.string().optional(), background: z.enum(['primary', 'tint01', 'tint02', 'tint03', '']).optional() })).optional(),
})

const emailBuildSchema = z.object({
  version: z.literal(1),
  themeId: z.string(),
  headerTypeId: z.string().optional(),
  modules: z.array(buildModuleSchema),
})

export const contentSchema = z.object({
  headline: z.string().max(80, 'Max 80 characters'),
  subHeadline: z.string().max(80, 'Max 80 characters').optional(),
  greetingId: z.string().optional(),
  disclaimerId: z.string().optional(),
  bodyIntro: z.string(),
  sections: z.array(contentSectionSchema).max(4, 'Max 4 sections'),
  modules: z.array(z.string()),
  moduleNotes: z.record(z.string()).optional(),
  build: emailBuildSchema.optional(),
  cta: ctaSchema,
  legalDisclaimer: z.string().optional(),
  footerSignoff: z.string().optional(),
  footerSignoffId: z.string().optional(),
  includeUnsubscribe: z.boolean(),
})

const assetAttachmentSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
  path: z.string().optional(),
})

const assetSchema = z.object({
  headerType: z.string().optional().default('standard'),
  logoVariant: z.enum(LOGO_VARIANTS),
  stripeColour: z.string().optional(),
  heroImageUrl: z.string().optional().refine(
    (val) => !val || val.startsWith('https://') || val.startsWith('data:'),
    { message: 'Must be an HTTPS URL' }
  ),
  heroImageAlt: z.string(),
  additionalAssetUrls: z.array(z.string()),
  attachments: z.array(assetAttachmentSchema),
})

const deadlineSchema = z.object({
  contentApprovalDate: z.string().optional().default(''),
  sendDate: z.string().min(1, 'Send date is required'),
  urgency: z.enum(URGENCY_OPTIONS).default('standard'),
  oneOnOneRequired: z.boolean(),
  notes: z.string().max(300, 'Max 300 characters').optional(),
  tags: z.string().optional(),
})

const htmlEditSchema = z.object({
  selector: z.string(),
  originalText: z.string(),
  newText: z.string(),
})

export const briefSchema = z.object({
  meta: metaSchema,
  campaign: campaignSchema,
  audience: audienceSchema,
  content: contentSchema,
  htmlEdits: z.array(htmlEditSchema).optional(),
  assets: assetSchema,
  deadlines: deadlineSchema,
})

export type BriefFormData = z.infer<typeof briefSchema>
