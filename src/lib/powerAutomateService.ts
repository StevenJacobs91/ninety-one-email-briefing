/**
 * powerAutomateService.ts
 *
 * Sends data to Microsoft Power Automate HTTP-trigger flows.
 *
 * Each public function composes a typed payload and POSTs it to the
 * configured webhook URL. The URL itself is the only credential required —
 * it embeds an Azure SAS token. An optional shared-secret header can be
 * added for extra validation inside the flow.
 *
 * Power Automate connector used: "When an HTTP request is received" (Premium).
 */

import type { PowerAutomateConfig } from '../types/settings.types'
import type { BriefPayload } from '../types/brief.types'

// ─── Public types ─────────────────────────────────────────────────────────────

export type PATriggerResult =
  | { ok: true;  status: number }
  | { ok: false; error: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildHeaders(config: PowerAutomateConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.secretHeaderName?.trim() && config.secretHeaderValue?.trim()) {
    headers[config.secretHeaderName.trim()] = config.secretHeaderValue.trim()
  }
  return headers
}

async function postToFlow(
  config: PowerAutomateConfig,
  webhookUrl: string,
  payload: unknown,
): Promise<PATriggerResult> {
  if (!webhookUrl.trim()) return { ok: false, error: 'No webhook URL configured for this flow.' }

  const timeoutMs = Math.min(Math.max((config.timeoutSeconds ?? 30), 3), 60) * 1000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      return { ok: false, error: `Flow returned ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Request timed out after ${timeoutMs / 1000}s.` }
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error contacting flow.' }
  }
}

async function postWithRetry(
  config: PowerAutomateConfig,
  webhookUrl: string,
  payload: unknown,
): Promise<PATriggerResult> {
  const result = await postToFlow(config, webhookUrl, payload)
  if (result.ok || !config.retryOnFailure) return result

  // Wait 5 s then retry once
  await new Promise((r) => setTimeout(r, 5000))
  return postToFlow(config, webhookUrl, payload)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fires the Brief Submission flow.
 * Called when the user submits a brief.
 */
export async function triggerBriefSubmission(
  config: PowerAutomateConfig,
  brief: BriefPayload,
  extras?: {
    kanbanCardId?: string
    submittedBy?: string
  },
): Promise<PATriggerResult> {
  if (!config.enabled) return { ok: false, error: 'Power Automate integration is disabled.' }
  const { briefSubmissionFlow } = config
  if (!briefSubmissionFlow.enabled) return { ok: false, error: 'Brief Submission flow is disabled.' }
  if (!briefSubmissionFlow.webhookUrl) return { ok: false, error: 'Brief Submission flow has no webhook URL.' }

  // Core fields always included
  const payload: Record<string, unknown> = {
    triggeredAt:         new Date().toISOString(),
    source:              'Ninety One Email Briefing',
    briefId:             brief.meta.briefId,
    status:              brief.meta.status,
    campaignName:        brief.campaign.campaignName,
    emailType:           brief.campaign.emailType,
    theme:               brief.campaign.theme,
    subjectLine:         brief.campaign.subjectLine,
    previewText:         brief.campaign.previewText,
    fromName:            brief.campaign.fromName,
    replyToEmail:        brief.campaign.replyToEmail,
    region:              brief.audience.region,
    channel:             brief.audience.channel,
    pardotListId:        brief.audience.pardotListId,
    headline:            brief.content.headline,
    ctaLabel:            brief.content.cta.label,
    ctaUrl:              brief.content.cta.url,
    sendDate:            brief.deadlines.sendDate,
    contentApprovalDate: brief.deadlines.contentApprovalDate,
    urgency:             brief.deadlines.urgency,
    notes:               brief.deadlines.notes,
    ...extras,
  }

  if (config.includeFullBrief)   payload.brief         = brief
  if (config.includeKanbanData && extras?.kanbanCardId)
                                 payload.kanbanCardId  = extras.kanbanCardId

  return postWithRetry(config, briefSubmissionFlow.webhookUrl, payload)
}

/**
 * Fires the List Analysis flow.
 * Called when requesting Pardot list health data.
 */
export async function triggerListAnalysis(
  config: PowerAutomateConfig,
  listId: string,
): Promise<PATriggerResult> {
  if (!config.enabled) return { ok: false, error: 'Power Automate integration is disabled.' }
  const { listAnalysisFlow } = config
  if (!listAnalysisFlow.enabled) return { ok: false, error: 'List Analysis flow is disabled.' }
  if (!listAnalysisFlow.webhookUrl) return { ok: false, error: 'List Analysis flow has no webhook URL.' }

  return postWithRetry(config, listAnalysisFlow.webhookUrl, {
    triggeredAt: new Date().toISOString(),
    source:      'Ninety One Email Briefing',
    listId,
  })
}

/**
 * Fires the Campaign Insights flow.
 * Called when requesting Pardot campaign performance data.
 */
export async function triggerCampaignInsights(
  config: PowerAutomateConfig,
  campaignId: string,
): Promise<PATriggerResult> {
  if (!config.enabled) return { ok: false, error: 'Power Automate integration is disabled.' }
  const { campaignInsightsFlow } = config
  if (!campaignInsightsFlow.enabled) return { ok: false, error: 'Campaign Insights flow is disabled.' }
  if (!campaignInsightsFlow.webhookUrl) return { ok: false, error: 'Campaign Insights flow has no webhook URL.' }

  return postWithRetry(config, campaignInsightsFlow.webhookUrl, {
    triggeredAt: new Date().toISOString(),
    source:      'Ninety One Email Briefing',
    campaignId,
  })
}

/**
 * Sends a test ping to any webhook URL.
 * Used by the Settings panel "Test" buttons.
 */
export async function testFlowWebhook(
  config: PowerAutomateConfig,
  webhookUrl: string,
): Promise<PATriggerResult> {
  return postToFlow(config, webhookUrl, {
    test:        true,
    triggeredAt: new Date().toISOString(),
    source:      'Ninety One Email Briefing — connection test',
    message:     'This is a test trigger from the Settings panel.',
  })
}
