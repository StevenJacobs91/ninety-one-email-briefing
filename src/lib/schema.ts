import { z } from 'zod'
import { EMAIL_TYPES, REGIONS, CHANNELS, CLIENT_GROUPS, LOGO_VARIANTS, URGENCY_OPTIONS } from './constants'

const brandThemeIds = [
  'leatherback-coral', 'leatherback-yellowood', 'marula-gold', 'marula-coral',
  'pinotage-coral', 'springbok-red', 'springbok-teal', 'springbok-burgundy',
  'agulhas-gold', 'agulhas-teal', 'agulhas-red', 'agulhas-coral',
  'agulhas-yellowwood', 'galjoen-coral', 'galjoen-green',
] as const

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
  emailType: z.enum(EMAIL_TYPES, { required_error: 'Email type is required' }),
  campaignName: z.string().min(1, 'Campaign name is required'),
  theme: z.enum(brandThemeIds, { required_error: 'Theme is required' }),
  subjectLine: z.string().min(1, 'Subject line is required').max(60, 'Max 60 characters'),
  previewText: z.string().min(1, 'Preview text is required').max(90, 'Max 90 characters'),
  fromName: z.string().min(1, 'From name is required'),
  fromAddress: z.string().email('Must be a valid email address'),
  replyToEmail: z.string().email('Must be a valid email address').or(z.literal('')).optional(),
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
  clientGroup: z.array(z.enum(CLIENT_GROUPS)).min(1, 'Select at least one client group'),
  region: z.array(z.enum(REGIONS)).min(1, 'Select at least one region'),
  channel: z.array(z.enum(CHANNELS)).min(1, 'Select at least one channel'),
  pardotListId: z.string().optional(),
  distributionList: distributionListSchema.optional(),
})

const contentSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(80, 'Max 80 characters'),
  subHeadline: z.string().max(80, 'Max 80 characters').optional(),
  bodyIntro: z.string().min(1, 'Body intro is required').max(1000, 'Max 1000 characters'),
  sections: z.array(contentSectionSchema).min(1, 'At least one section required').max(4, 'Max 4 sections'),
  modules: z.array(z.string()),
  moduleNotes: z.record(z.string()).optional(),
  cta: ctaSchema,
  legalDisclaimer: z.string().optional(),
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
    (val) => !val || val.startsWith('https://'),
    { message: 'Must be an HTTPS URL' }
  ),
  heroImageAlt: z.string(),
  additionalAssetUrls: z.array(z.string()),
  attachments: z.array(assetAttachmentSchema),
})

const deadlineSchema = z.object({
  contentApprovalDate: z.string().min(1, 'Content approval date is required'),
  sendDate: z.string().min(1, 'Send date is required'),
  urgency: z.enum(URGENCY_OPTIONS),
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
  deadlines: deadlineSchema.superRefine((data, ctx) => {
    if (data.contentApprovalDate && data.sendDate) {
      if (new Date(data.sendDate) <= new Date(data.contentApprovalDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Send date must be after content approval date',
          path: ['sendDate'],
        })
      }
    }
  }),
})

export type BriefFormData = z.infer<typeof briefSchema>
