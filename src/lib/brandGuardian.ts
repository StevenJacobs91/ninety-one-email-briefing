import type { BriefPayload } from '../types/brief.types'
import type { BrandGuardianConfig, BrandThemeConfig, HtmlModuleConfig } from '../types/settings.types'
import { BRAND_THEMES, EMAIL_TYPE_LABELS, EMAIL_MODULES } from './constants'
import { DEFAULT_BRAND_GUARDIAN } from './settingsDefaults'
import type { EmailType } from './constants'

export interface BrandGuardianOptions {
  config?: BrandGuardianConfig
  themes?: BrandThemeConfig[]
  modules?: HtmlModuleConfig[]
}

export interface BrandFeedbackItem {
  field: string
  category: string
  severity: 'pass' | 'warning' | 'error'
  message: string
}

export interface BrandReview {
  status: 'approved' | 'needs-review' | 'rejected'
  score: number
  items: BrandFeedbackItem[]
  summary: string
}

/**
 * Runs a comprehensive Brand Guardian review against a completed brief.
 *
 * Covers:
 * - Visual Identity (theme, colours, logo, imagery)
 * - Brand Voice & Messaging (tone, language, naming, subject line)
 * - Content Structure & Quality (sections, modules, readability)
 * - Audience & Distribution Alignment
 * - Compliance & Accessibility
 * - Brand Protection (consistency, guidelines adherence)
 */
export function runBrandGuardianReview(brief: BriefPayload, opts?: BrandGuardianOptions): BrandReview {
  const cfg = opts?.config ?? DEFAULT_BRAND_GUARDIAN
  const themeList = opts?.themes ?? BRAND_THEMES
  const moduleList = opts?.modules ?? EMAIL_MODULES
  const items: BrandFeedbackItem[] = []

  // ─── VISUAL IDENTITY SYSTEM ─────────────────────────────────────

  // 1. Theme validation
  const theme = themeList.find((t) => t.id === brief.campaign.theme)
  if (theme) {
    items.push({
      field: 'campaign.theme',
      category: 'Visual Identity',
      severity: 'pass',
      message: `Theme "${theme.label}" is a valid Ninety One brand theme (primary: ${theme.primary}, accent: ${theme.accent}).`,
    })
  } else {
    items.push({
      field: 'campaign.theme',
      category: 'Visual Identity',
      severity: 'error',
      message: 'Selected theme is not in the approved Ninety One brand palette. All emails must use one of the 15 approved brand themes.',
    })
  }

  // 2. Light vs dark primary check — Springbok Cream themes need special handling
  if (theme) {
    const isLightPrimary = ['springbok-red', 'springbok-teal', 'springbok-burgundy'].includes(brief.campaign.theme)
    if (isLightPrimary) {
      items.push({
        field: 'campaign.theme',
        category: 'Visual Identity',
        severity: 'warning',
        message: `Springbok Cream themes use a light primary (#e8e5ce). Ensure text contrast meets WCAG AA (4.5:1) on light backgrounds. Body text should use a dark colour for readability.`,
      })
    }
  }

  // 3. Stripe colour override
  if (brief.assets.stripeColour) {
    const isThemeColour =
      theme &&
      (brief.assets.stripeColour.toLowerCase() === theme.accent.toLowerCase() ||
        brief.assets.stripeColour.toLowerCase() === theme.primary.toLowerCase())
    if (isThemeColour) {
      items.push({
        field: 'assets.stripeColour',
        category: 'Visual Identity',
        severity: 'pass',
        message: 'Stripe colour matches the selected theme palette.',
      })
    } else {
      items.push({
        field: 'assets.stripeColour',
        category: 'Visual Identity',
        severity: 'warning',
        message: `Custom stripe colour "${brief.assets.stripeColour}" deviates from the theme palette (${theme?.primary ?? '?'} / ${theme?.accent ?? '?'}). Brand guidelines require approval for non-standard colours.`,
      })
    }
  }

  // 4. Logo variant appropriateness
  const logoVariant = brief.assets.logoVariant
  if (logoVariant === 'icon') {
    items.push({
      field: 'assets.logoVariant',
      category: 'Visual Identity',
      severity: 'warning',
      message: 'Icon-only logo variant should only be used when brand name is established in context. Horizontal or stacked variants are recommended for email headers.',
    })
  } else {
    items.push({
      field: 'assets.logoVariant',
      category: 'Visual Identity',
      severity: 'pass',
      message: `Logo variant "${logoVariant}" is appropriate for email format with clear brand identification.`,
    })
  }

  // 5. Hero image accessibility
  if (brief.assets.heroImageUrl && brief.assets.heroImageAlt) {
    const altLength = brief.assets.heroImageAlt.length
    if (altLength < 10) {
      items.push({
        field: 'assets.heroImageAlt',
        category: 'Accessibility',
        severity: 'warning',
        message: `Hero image alt text is only ${altLength} characters. Descriptive alt text (15-125 chars) improves accessibility and SEO.`,
      })
    } else {
      items.push({
        field: 'assets.heroImageAlt',
        category: 'Accessibility',
        severity: 'pass',
        message: 'Hero image has descriptive alt text — meets accessibility standards.',
      })
    }
  } else if (brief.assets.heroImageUrl && !brief.assets.heroImageAlt) {
    items.push({
      field: 'assets.heroImageAlt',
      category: 'Accessibility',
      severity: 'error',
      message: 'Hero image is missing alt text. This is required for screen readers, Outlook image blocking fallback, and WCAG compliance.',
    })
  }

  // 6. Hero image URL validation
  if (brief.assets.heroImageUrl) {
    if (!brief.assets.heroImageUrl.startsWith('https://')) {
      items.push({
        field: 'assets.heroImageUrl',
        category: 'Brand Protection',
        severity: 'error',
        message: 'Hero image URL must use HTTPS. Non-secure image URLs will be blocked by most email clients.',
      })
    } else {
      items.push({
        field: 'assets.heroImageUrl',
        category: 'Visual Identity',
        severity: 'pass',
        message: 'Hero image URL uses HTTPS — secure delivery confirmed.',
      })
    }
  }

  // ─── BRAND VOICE & MESSAGING ────────────────────────────────────

  // 7. From name consistency
  const fromName = brief.campaign.fromName
  if (fromName === 'Ninety One' || fromName.toLowerCase().includes('ninety one')) {
    items.push({
      field: 'campaign.fromName',
      category: 'Brand Voice',
      severity: 'pass',
      message: 'From name follows the "Ninety One" brand convention.',
    })
  } else {
    items.push({
      field: 'campaign.fromName',
      category: 'Brand Voice',
      severity: 'warning',
      message: `From name "${fromName}" does not include "Ninety One". Sub-brand or co-branded sends need documented approval. Brand guidelines state "Ninety One" should appear in sender name for recognition.`,
    })
  }

  // 8. Subject line length best practice
  const subjectLen = brief.campaign.subjectLine.length
  if (subjectLen <= 40) {
    items.push({
      field: 'campaign.subjectLine',
      category: 'Brand Voice',
      severity: 'pass',
      message: `Subject line is ${subjectLen} chars — excellent for mobile preview (40 chars visible on most devices).`,
    })
  } else if (subjectLen <= 50) {
    items.push({
      field: 'campaign.subjectLine',
      category: 'Brand Voice',
      severity: 'pass',
      message: `Subject line is ${subjectLen} chars — within the optimal 50-char range for mobile preview.`,
    })
  } else {
    items.push({
      field: 'campaign.subjectLine',
      category: 'Brand Voice',
      severity: 'warning',
      message: `Subject line is ${subjectLen} chars. Most mobile clients truncate after 40-50 chars. Consider shortening for better inbox rendering.`,
    })
  }

  // 9. Subject line tone — avoid spam-trigger words
  const subjectLower = brief.campaign.subjectLine.toLowerCase()
  const spamTriggers = cfg.spamTriggerWords
  const foundSpam = spamTriggers.filter((t) => subjectLower.includes(t))
  if (foundSpam.length > 0) {
    items.push({
      field: 'campaign.subjectLine',
      category: 'Brand Voice',
      severity: 'warning',
      message: `Subject line contains potential spam trigger words: "${foundSpam.join('", "')}". These may affect deliverability and do not align with Ninety One's professional tone.`,
    })
  }

  // 10. Subject line capitalisation
  const allCaps = brief.campaign.subjectLine === brief.campaign.subjectLine.toUpperCase() && subjectLen > 5
  if (allCaps) {
    items.push({
      field: 'campaign.subjectLine',
      category: 'Brand Voice',
      severity: 'warning',
      message: 'Subject line is ALL CAPS. Ninety One brand voice uses sentence case for a professional, composed tone.',
    })
  }

  // 11. Preview text quality
  const previewLen = brief.campaign.previewText.length
  if (previewLen < 30) {
    items.push({
      field: 'campaign.previewText',
      category: 'Brand Voice',
      severity: 'warning',
      message: `Preview text is only ${previewLen} chars. Aim for 40-90 chars to maximise inbox preview space and reduce fallback to body text.`,
    })
  } else {
    items.push({
      field: 'campaign.previewText',
      category: 'Brand Voice',
      severity: 'pass',
      message: `Preview text is ${previewLen} chars — good length for inbox preview across email clients.`,
    })
  }

  // 12. Preview text shouldn't repeat subject line
  if (brief.campaign.previewText.toLowerCase() === brief.campaign.subjectLine.toLowerCase()) {
    items.push({
      field: 'campaign.previewText',
      category: 'Brand Voice',
      severity: 'warning',
      message: 'Preview text is identical to the subject line. Use preview text to expand on the subject line with additional context or a supporting message.',
    })
  }

  // 13. Campaign name format
  if (brief.campaign.campaignName.length < 3) {
    items.push({
      field: 'campaign.campaignName',
      category: 'Brand Voice',
      severity: 'warning',
      message: 'Campaign name is very short. Use a descriptive internal name for easy identification in analytics and reporting.',
    })
  } else {
    items.push({
      field: 'campaign.campaignName',
      category: 'Brand Voice',
      severity: 'pass',
      message: 'Campaign name is descriptive for internal tracking.',
    })
  }

  // ─── CONTENT STRUCTURE & QUALITY ────────────────────────────────

  // 14. Email type / content alignment
  const emailTypeLabel = EMAIL_TYPE_LABELS[brief.campaign.emailType as EmailType]
  if (emailTypeLabel) {
    items.push({
      field: 'campaign.emailType',
      category: 'Content Structure',
      severity: 'pass',
      message: `Email type "${emailTypeLabel}" is a valid Ninety One email category.`,
    })
  }

  // 15. Content section count
  const sectionCount = brief.content.sections.length
  if (sectionCount === 1) {
    items.push({
      field: 'content.sections',
      category: 'Content Structure',
      severity: 'pass',
      message: 'Single focused section — optimal for campaign and announcement emails with a clear single message.',
    })
  } else if (sectionCount <= 3) {
    items.push({
      field: 'content.sections',
      category: 'Content Structure',
      severity: 'pass',
      message: `${sectionCount} content sections — within brand guidelines for optimal readability and engagement.`,
    })
  } else {
    items.push({
      field: 'content.sections',
      category: 'Content Structure',
      severity: 'warning',
      message: `${sectionCount} content sections may result in excessive email length. Brand guidelines recommend 1-3 sections. Consider consolidating or using a newsletter format.`,
    })
  }

  // 16. Headline quality
  const headlineLen = brief.content.headline.length
  if (headlineLen > 60) {
    items.push({
      field: 'content.headline',
      category: 'Content Structure',
      severity: 'warning',
      message: `Headline is ${headlineLen} chars. Brand templates use Ninety One Visuelt Display at 34px — headlines over 60 chars may wrap awkwardly on mobile.`,
    })
  } else {
    items.push({
      field: 'content.headline',
      category: 'Content Structure',
      severity: 'pass',
      message: `Headline length (${headlineLen} chars) renders well in the template header.`,
    })
  }

  // 17. Body intro length
  const bodyIntroLen = brief.content.bodyIntro.length
  if (bodyIntroLen > 200) {
    items.push({
      field: 'content.bodyIntro',
      category: 'Content Structure',
      severity: 'warning',
      message: `Body intro is ${bodyIntroLen} chars. Keep introductory text concise (under 200 chars) to maintain reader engagement above the fold.`,
    })
  } else {
    items.push({
      field: 'content.bodyIntro',
      category: 'Content Structure',
      severity: 'pass',
      message: 'Body intro is concise and appropriate for the email opening.',
    })
  }

  // 18. CTA label tone
  const ctaLabel = brief.content.cta.label.toLowerCase()
  const actionWords = [
    'learn', 'read', 'watch', 'discover', 'explore', 'register', 'download',
    'view', 'invest', 'find', 'get', 'start', 'join', 'see', 'contact',
    'sign', 'subscribe', 'attend', 'rsvp', 'listen', 'apply', 'book',
  ]
  const hasActionWord = actionWords.some((w) => ctaLabel.includes(w))
  if (hasActionWord) {
    items.push({
      field: 'content.cta.label',
      category: 'Brand Voice',
      severity: 'pass',
      message: 'CTA label uses an action-oriented verb — aligned with brand best practice for clear user direction.',
    })
  } else {
    items.push({
      field: 'content.cta.label',
      category: 'Brand Voice',
      severity: 'warning',
      message: `CTA label "${brief.content.cta.label}" could benefit from a stronger action verb (e.g., "Learn more", "Register now", "Read the update"). Ninety One brand voice favours clear, direct calls to action.`,
    })
  }

  // 19. CTA label length
  if (brief.content.cta.label.length > 25) {
    items.push({
      field: 'content.cta.label',
      category: 'Content Structure',
      severity: 'warning',
      message: `CTA label is ${brief.content.cta.label.length} chars. Keep button text under 25 chars for optimal rendering across email clients, especially mobile.`,
    })
  }

  // 20. CTA URL validation
  if (brief.content.cta.url && !brief.content.cta.url.includes('ninetyone.com') && !brief.content.cta.url.includes('pardot')) {
    items.push({
      field: 'content.cta.url',
      category: 'Brand Protection',
      severity: 'warning',
      message: `CTA links to an external domain. Ensure the destination URL is brand-approved and includes appropriate UTM tracking parameters.`,
    })
  }

  // 21. Module selection review
  const selectedModules = brief.content.modules ?? []
  if (selectedModules.length === 0) {
    items.push({
      field: 'content.modules',
      category: 'Content Structure',
      severity: 'warning',
      message: 'No email modules selected. Consider adding modules (headers, CTAs, speakers, articles, etc.) to enrich the email layout beyond basic sections.',
    })
  } else {
    const moduleLabels = selectedModules
      .map((id) => moduleList.find((m) => m.id === id)?.label ?? id)
    items.push({
      field: 'content.modules',
      category: 'Content Structure',
      severity: 'pass',
      message: `${selectedModules.length} module(s) selected: ${moduleLabels.join(', ')}. Template modules will be included in the HTML output.`,
    })

    // Check for conflicting modules (e.g., multiple headers or footers)
    const headerModules = selectedModules.filter((m) => m.startsWith('header-'))
    const footerModules = selectedModules.filter((m) => m.startsWith('footer-'))
    if (headerModules.length > 1) {
      items.push({
        field: 'content.modules',
        category: 'Content Structure',
        severity: 'warning',
        message: `Multiple header modules selected (${headerModules.length}). Typically only one header module should be used per email.`,
      })
    }
    if (footerModules.length > 1) {
      items.push({
        field: 'content.modules',
        category: 'Content Structure',
        severity: 'warning',
        message: `Multiple footer modules selected (${footerModules.length}). Use a single footer for consistent brand presentation.`,
      })
    }
  }

  // 22. Email type + module alignment
  const emailType = brief.campaign.emailType
  if (emailType === 'event-invitation') {
    const hasEventModule = selectedModules.some((m) => m.startsWith('event-registration') || m === 'itinerary-table' || m.startsWith('speaker'))
    if (!hasEventModule) {
      items.push({
        field: 'content.modules',
        category: 'Content Structure',
        severity: 'warning',
        message: 'Email type is "Event Invitation" but no event registration, itinerary, or speaker modules are selected. Consider adding relevant event modules.',
      })
    }
  }

  if (emailType === 'newsletter') {
    const hasArticleModule = selectedModules.some((m) => m.startsWith('article-list'))
    if (!hasArticleModule) {
      items.push({
        field: 'content.modules',
        category: 'Content Structure',
        severity: 'warning',
        message: 'Email type is "Newsletter" but no article list modules are selected. Article lists help structure newsletter content effectively.',
      })
    }
  }

  // ─── AUDIENCE & DISTRIBUTION ────────────────────────────────────

  // 23. Region alignment
  if (brief.audience.region.length > 0) {
    items.push({
      field: 'audience.region',
      category: 'Audience Alignment',
      severity: 'pass',
      message: `Targeting ${brief.audience.region.join(', ')} — ensure legal disclaimer, regulatory language, and contact information match the target region requirements.`,
    })
  }

  // 24. Client group coverage
  if (brief.audience.clientGroup.length > 0) {
    items.push({
      field: 'audience.clientGroup',
      category: 'Audience Alignment',
      severity: 'pass',
      message: `Client group: ${brief.audience.clientGroup.join(', ')}. Ensure tone and content sophistication match the target audience segment.`,
    })
  }

  // 25. Channel appropriateness
  const channels = brief.audience.channel
  if (channels.includes('Individual Investor') && channels.includes('Institutional')) {
    items.push({
      field: 'audience.channel',
      category: 'Audience Alignment',
      severity: 'warning',
      message: 'Targeting both "Individual Investor" and "Institutional" audiences. These segments have different regulatory requirements and content expectations. Consider separate sends with tailored messaging.',
    })
  } else if (channels.length > 0) {
    items.push({
      field: 'audience.channel',
      category: 'Audience Alignment',
      severity: 'pass',
      message: `Channel targeting (${channels.join(', ')}) is consistent — messaging can be tailored for this audience.`,
    })
  }

  // 26. Internal channel check
  if (channels.includes('Internal') && channels.length > 1) {
    items.push({
      field: 'audience.channel',
      category: 'Audience Alignment',
      severity: 'warning',
      message: 'Internal audience is mixed with external channels. Internal communications may contain information not approved for external distribution.',
    })
  }

  // ─── COMPLIANCE & ACCESSIBILITY ─────────────────────────────────

  // 27. Unsubscribe link
  if (brief.content.includeUnsubscribe) {
    items.push({
      field: 'content.includeUnsubscribe',
      category: 'Compliance',
      severity: 'pass',
      message: 'Unsubscribe link included — required by CAN-SPAM Act, GDPR, and POPIA for all marketing communications.',
    })
  } else {
    const isInternal = channels.length === 1 && channels[0] === 'Internal'
    if (isInternal) {
      items.push({
        field: 'content.includeUnsubscribe',
        category: 'Compliance',
        severity: 'warning',
        message: 'Unsubscribe link not included. This is acceptable for internal-only communications but should be added if any external recipients are included.',
      })
    } else {
      items.push({
        field: 'content.includeUnsubscribe',
        category: 'Compliance',
        severity: 'error',
        message: 'Unsubscribe link is missing. This is legally required for all external marketing emails under CAN-SPAM, GDPR, and POPIA regulations.',
      })
    }
  }

  // 28. Legal disclaimer
  if (brief.content.legalDisclaimer) {
    items.push({
      field: 'content.legalDisclaimer',
      category: 'Compliance',
      severity: 'pass',
      message: 'Custom legal disclaimer provided. Ensure it has been reviewed and approved by the Ninety One legal/compliance team for the target regions.',
    })
  } else {
    items.push({
      field: 'content.legalDisclaimer',
      category: 'Compliance',
      severity: 'pass',
      message: 'Using the default legal disclaimer. Verify it covers the regulatory requirements for the selected regions.',
    })
  }

  // 29. Pardot list ID check
  if (brief.audience.pardotListId) {
    items.push({
      field: 'audience.pardotListId',
      category: 'Compliance',
      severity: 'pass',
      message: `Pardot List ID "${brief.audience.pardotListId}" specified — distribution list is defined for send.`,
    })
  } else {
    items.push({
      field: 'audience.pardotListId',
      category: 'Compliance',
      severity: 'warning',
      message: 'No Pardot List ID specified. Ensure the distribution list is configured in Pardot before scheduling the send.',
    })
  }

  // ─── BRAND PROTECTION & CONSISTENCY ─────────────────────────────

  // 30. From address domain check
  const fromAddress = brief.campaign.fromAddress
  if (fromAddress && fromAddress.endsWith('@ninetyone.com')) {
    items.push({
      field: 'campaign.fromAddress',
      category: 'Brand Protection',
      severity: 'pass',
      message: 'From address uses the @ninetyone.com domain — consistent with brand identity.',
    })
  } else if (fromAddress) {
    items.push({
      field: 'campaign.fromAddress',
      category: 'Brand Protection',
      severity: 'warning',
      message: `From address "${fromAddress}" does not use the @ninetyone.com domain. External sending addresses may affect deliverability and brand trust.`,
    })
  }

  // 30b. Reply-to email domain check (optional)
  const replyEmail = brief.campaign.replyToEmail
  if (replyEmail && replyEmail.endsWith('@ninetyone.com')) {
    items.push({
      field: 'campaign.replyToEmail',
      category: 'Brand Protection',
      severity: 'pass',
      message: 'Reply-to email uses the @ninetyone.com domain — consistent with brand identity.',
    })
  } else if (replyEmail) {
    items.push({
      field: 'campaign.replyToEmail',
      category: 'Brand Protection',
      severity: 'warning',
      message: `Reply-to email "${replyEmail}" does not use the @ninetyone.com domain. External reply-to addresses may reduce trust and brand recognition.`,
    })
  }

  // 31. Deadline review
  if (brief.deadlines.contentApprovalDate && brief.deadlines.sendDate) {
    const approval = new Date(brief.deadlines.contentApprovalDate)
    const send = new Date(brief.deadlines.sendDate)
    const daysBetween = Math.floor((send.getTime() - approval.getTime()) / (1000 * 60 * 60 * 24))

    if (daysBetween < cfg.minDaysBetweenApprovalAndSend) {
      items.push({
        field: 'deadlines',
        category: 'Brand Protection',
        severity: 'warning',
        message: `Only ${daysBetween} day(s) between content approval and send date. Brand guidelines recommend at least 2 business days for QA, testing, and stakeholder sign-off.`,
      })
    } else {
      items.push({
        field: 'deadlines',
        category: 'Brand Protection',
        severity: 'pass',
        message: `${daysBetween} days between approval and send — sufficient time for quality assurance and testing.`,
      })
    }
  }

  // 32. Urgency + timeline alignment
  if (brief.deadlines.urgency === 'urgent') {
    items.push({
      field: 'deadlines.urgency',
      category: 'Brand Protection',
      severity: 'warning',
      message: 'Brief marked as urgent. Ensure expedited review does not compromise brand quality standards, accessibility checks, and legal compliance review.',
    })
  }

  // 33. Section body length consistency
  const longSections = brief.content.sections.filter((s) => s.body.length > 400)
  if (longSections.length > 0) {
    items.push({
      field: 'content.sections',
      category: 'Content Structure',
      severity: 'warning',
      message: `${longSections.length} section(s) exceed 400 characters. Email content should be scannable — consider breaking lengthy content into bullet points or multiple sections.`,
    })
  }

  // 34. Typography — check for excessive punctuation
  const allText = `${brief.content.headline} ${brief.content.bodyIntro} ${brief.content.sections.map((s) => s.heading + ' ' + s.body).join(' ')}`
  const exclamationCount = (allText.match(/!/g) || []).length
  if (exclamationCount > cfg.maxExclamationMarks) {
    items.push({
      field: 'content',
      category: 'Brand Voice',
      severity: 'warning',
      message: `Found ${exclamationCount} exclamation marks across content. Ninety One brand voice is composed and authoritative — limit exclamation marks for a more professional tone.`,
    })
  }

  // 35. Check for brand name consistency in content
  const allContentLower = allText.toLowerCase()
  const badNameVariants = cfg.brandNameVariants
  const foundBadNames = badNameVariants.filter((v) => allContentLower.includes(v))
  if (foundBadNames.length > 0) {
    items.push({
      field: 'content',
      category: 'Brand Protection',
      severity: 'warning',
      message: `Content may contain incorrect brand name variants: "${foundBadNames.join('", "')}". The correct form is "Ninety One" (two words, capitalised).`,
    })
  }

  // 36. Additional asset URLs
  if (brief.assets.additionalAssetUrls.length > 0) {
    const nonHttps = brief.assets.additionalAssetUrls.filter((u) => u && !u.startsWith('https://'))
    if (nonHttps.length > 0) {
      items.push({
        field: 'assets.additionalAssetUrls',
        category: 'Brand Protection',
        severity: 'error',
        message: `${nonHttps.length} additional asset URL(s) do not use HTTPS. All image assets must be served over HTTPS for email client compatibility.`,
      })
    }
  }

  // ─── FILTER BY ENABLED CATEGORIES ─────────────────────────────

  const categoryToggle: Record<string, boolean> = {
    'Visual Identity': true, // always on
    'Brand Voice': cfg.enableBrandVoiceChecks,
    'Content Structure': cfg.enableContentStructureChecks,
    'Audience Alignment': cfg.enableAudienceAlignmentChecks,
    'Compliance': cfg.enableComplianceChecks,
    'Accessibility': cfg.enableAccessibilityChecks,
    'Brand Protection': cfg.enableBrandProtectionChecks,
  }

  const filteredItems = items.filter((item) => categoryToggle[item.category] !== false)

  // ─── SCORE CALCULATION ──────────────────────────────────────────

  const errors = filteredItems.filter((i) => i.severity === 'error').length
  const warnings = filteredItems.filter((i) => i.severity === 'warning').length
  const passes = filteredItems.filter((i) => i.severity === 'pass').length
  const total = filteredItems.length
  const score = total > 0 ? Math.round(((passes * 1 + warnings * 0.5) / total) * 100) : 100

  let status: BrandReview['status']
  let summary: string

  if (errors > 0) {
    status = 'rejected'
    summary = `Brand review found ${errors} critical issue${errors > 1 ? 's' : ''} and ${warnings} warning${warnings !== 1 ? 's' : ''} that should be addressed. Critical issues must be resolved before this email can proceed to production.`
  } else if (warnings > 3) {
    status = 'needs-review'
    summary = `Brand review found ${warnings} items that may need attention. The brief can proceed but consider addressing the warnings for optimal brand consistency and deliverability.`
  } else if (warnings > 0) {
    status = 'approved'
    summary = `Brief passes brand review with a score of ${score}%. ${warnings} minor suggestion${warnings !== 1 ? 's' : ''} noted — all critical brand guidelines are met.`
  } else {
    status = 'approved'
    summary = `Excellent! Brief passes brand review with a perfect score. All brand guidelines, compliance requirements, and accessibility standards are met.`
  }

  return { status, score, items: filteredItems, summary }
}
