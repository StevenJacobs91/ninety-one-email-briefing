export interface BriefPayload {
  meta: BriefMeta
  campaign: CampaignDetails
  audience: AudienceDetails
  content: ContentDetails
  htmlEdits?: HtmlEdit[]
  assets: AssetDetails
  deadlines: DeadlineDetails
}

export interface BriefMeta {
  briefId: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'submitted'
}

export interface CampaignDetails {
  emailDescription: string
  emailType: string
  campaignName: string
  theme: string
  subjectLine: string
  previewText: string
  fromName: string
  fromAddress: string
  replyToEmail?: string
}

export interface DistributionListFile {
  name: string
  size: number
  type: string
  rowCount?: number
}

export interface AudienceDetails {
  clientGroup: string[]
  region: string[]
  channel: string[]
  pardotListId?: string
  distributionLists?: DistributionListFile[]
}

export interface ContentDetails {
  headline: string
  subHeadline?: string
  bodyIntro: string
  sections: ContentSection[]
  modules: string[]
  moduleNotes?: Record<string, string>
  cta: CallToAction
  legalDisclaimer?: string
  includeUnsubscribe: boolean
}

export interface ContentSection {
  id: string
  heading: string
  body: string
  imageRequired: boolean
  imageDescription?: string
}

export interface CallToAction {
  label: string
  url: string
  openInNewTab: boolean
}

export interface AssetAttachment {
  name: string
  size: number
  type: string
}

export interface AssetDetails {
  logoVariant: 'horizontal' | 'stacked' | 'icon'
  stripeColour?: string
  heroImageUrl?: string
  heroImageAlt: string
  additionalAssetUrls: string[]
  attachments: AssetAttachment[]
}

export interface DeadlineDetails {
  contentApprovalDate: string
  sendDate: string
  urgency: 'standard' | 'urgent'
  oneOnOneRequired: boolean
  notes?: string
}

export interface HtmlEdit {
  selector: string
  originalText: string
  newText: string
}
