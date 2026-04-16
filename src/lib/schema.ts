import { z } from 'zod'
import { LOGO_VARIANTS, URGENCY_OPTIONS } from './constants'

const contentSectionSchema = z.object({
  id: z.string(),
  heading: z.string().min(1, 'Heading is required').max(60, 'Max 60 characters'),
  body: z.string().min(1, 'Body is required').max(500, 'Max 500 characters'),
  imageRequired: z.boolean(),
  imageDescription: z.string().optional(),
})

const ctaSchema = z.object({
  label: z.string().min(1, 'CTA label is required').max(30, 'Max 30 characters'),
  url: z.string().url('Must be a valid URL'),
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

const contentSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(80, 'Max 80 characters'),
  subHeadline: z.string().max(80, 'Max 80 characters').optional(),
  greetingId: z.string().optional(),
  bodyIntro: z.string().min(1, 'Body intro is required'),
  sections: z.array(contentSectionSchema).min(1, 'At least one section required').max(4, 'Max 4 sections'),
  modules: z.array(z.string()),
  moduleNotes: z.record(z.string()).optional(),
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
})

const assetSchema = z.object({
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
  assets: assetSchema.superRefine((data, ctx) => {
    if (data.heroImageUrl && !data.heroImageAlt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Alt text is required when a hero image URL is provided',
        path: ['heroImageAlt'],
      })
    }
  }),
  deadlines: deadlineSchema,
})

export type BriefFormData = z.infer<typeof briefSchema>
