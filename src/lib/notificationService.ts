import type {
  NotificationsSettings,
  NotificationEventType,
  NotificationResult,
} from '../types/notifications.types'
import { NOTIFICATION_EVENT_META } from '../types/notifications.types'

// ─── Template interpolation ───────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

// ─── Webhook with retry ───────────────────────────────────────────────────────

async function postWithRetry(
  url: string,
  body: Record<string, unknown>,
  maxRetries: number,
  eventType: NotificationEventType
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString()
  let lastError = ''

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s, …
      await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { success: res.ok, statusCode: res.status, eventType, timestamp }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  return { success: false, error: lastError, eventType, timestamp }
}

// ─── Primary trigger function ─────────────────────────────────────────────────

/**
 * Fire a Power Automate notification for the given event.
 * Silent no-op if notifications are disabled or the event is not configured.
 */
export async function triggerNotification(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
  settings: NotificationsSettings
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString()
  const noop = (error: string): NotificationResult => ({ success: false, error, eventType, timestamp })

  if (!settings.enabled) return noop('Notifications disabled')

  const eventConfig = settings.events.find((e) => e.eventType === eventType)
  if (!eventConfig?.enabled) return noop('Event not enabled')

  const webhookUrl = (eventConfig.webhookUrl || '').trim() || settings.globalWebhookUrl.trim()
  if (!webhookUrl) return noop('No webhook URL configured')

  // Build flat string vars for subject interpolation
  const flatVars = Object.entries(data).reduce<Record<string, string>>((acc, [k, v]) => {
    if (typeof v === 'string') acc[k] = v
    else if (typeof v === 'number') acc[k] = String(v)
    return acc
  }, {})

  const subjectTemplate = eventConfig.subjectTemplate || NOTIFICATION_EVENT_META[eventType].defaultSubject
  const subject = interpolate(subjectTemplate, flatVars)

  // Build the additional recipients list
  const additionalRecipients = (eventConfig.additionalRecipients || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  const body: Record<string, unknown> = {
    event: eventType,
    eventLabel: NOTIFICATION_EVENT_META[eventType].label,
    subject,
    timestamp,
    ...data,
    recipients: {
      sendToRequester: eventConfig.sendToRequester,
      sendToTeam: eventConfig.sendToTeam,
      additional: additionalRecipients,
    },
  }

  // Strip full payload fields if not wanted
  if (!eventConfig.includeFullPayload) {
    delete body.fullBriefJson
  }

  const maxRetries = settings.retryOnFailure ? (settings.maxRetries ?? 3) : 0
  return postWithRetry(webhookUrl, body, maxRetries, eventType)
}

// ─── Test notification (bypasses enabled check) ───────────────────────────────

/** Posts a sample test payload to verify the webhook connection. */
export async function testNotification(
  eventType: NotificationEventType,
  settings: NotificationsSettings
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString()
  const noop = (error: string): NotificationResult => ({ success: false, error, eventType, timestamp })

  const eventConfig = settings.events.find((e) => e.eventType === eventType)
  const webhookUrl = (eventConfig?.webhookUrl || '').trim() || settings.globalWebhookUrl.trim()
  if (!webhookUrl) return noop('No webhook URL configured. Add a global URL or event-specific URL first.')

  const futureDateStr = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const testBody: Record<string, unknown> = {
    isTest: true,
    event: eventType,
    eventLabel: NOTIFICATION_EVENT_META[eventType].label,
    subject: `[TEST] ${NOTIFICATION_EVENT_META[eventType].label} — Ninety One`,
    timestamp,
    campaignName: '[TEST] Taking Stock SA — Q2 2026',
    emailName: '[TEST] Taking Stock SA — Q2 2026',
    emailType: 'newsletter',
    sendDate: futureDateStr,
    contentApprovalDate: futureDateStr,
    regions: 'ZA, UK',
    channels: 'INTERMEDIARY',
    urgency: 'standard',
    requesterName: 'Demo User',
    requesterEmail: 'demo@ninetyone.com',
    fromColumn: 'briefed',
    toColumn: 'in_production',
    movedBy: 'Producer Name',
    removedBy: 'Producer Name',
    cancelledBy: 'Requester Name',
    approverRole: 'Brand Guardian',
    approvedBy: 'Brand Guardian',
    approvedAt: timestamp,
    rejectedBy: 'Legal',
    reason: '[Sample] Please revise the disclaimer section.',
    dueDate: futureDateStr,
    displayName: 'New Team Member',
    role: 'requester',
    invitedBy: 'Admin User',
    briefId: 'test-brief-id-00001',
    recipients: {
      sendToRequester: true,
      sendToTeam: false,
      additional: [],
    },
  }

  return postWithRetry(webhookUrl, testBody, 0, eventType)
}
