import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  triggerTestEmail, isTestEmailFlowReady,
  triggerBriefSubmission, isBriefSubmissionFlowReady,
  triggerChecklistSend, isChecklistFlowReady,
} from './powerAutomateService.ts'
import { DEFAULT_POWER_AUTOMATE_CONFIG } from './settingsDefaults.ts'
import type { PowerAutomateConfig } from '../types/settings.types'
import type { BriefPayload } from '../types/brief.types'

const URL = 'https://flow.test/hook?sig=abc'
const ARGS = {
  recipient: 'recipient@example.com',
  subject: 'Taking Stock — Q2',
  html: '<html><body>hello</body></html>',
  emailName: 'Taking Stock Q2',
}

// retryOnFailure is off so a refusal is observed once, not retried after 5s.
function config(over: Partial<PowerAutomateConfig> = {}): PowerAutomateConfig {
  return {
    ...DEFAULT_POWER_AUTOMATE_CONFIG,
    enabled: true,
    retryOnFailure: false,
    testEmailFlow: { webhookUrl: URL, enabled: true },
    ...over,
  }
}

let calls: { url: string; init: RequestInit }[] = []

function stubFetch(status: number, body = '{}') {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init })
    return new Response(body, { status })
  }) as unknown as typeof fetch
}

beforeEach(() => { calls = []; stubFetch(200) })

test('posts the recipient, subject and html to the test-email flow url', async () => {
  const res = await triggerTestEmail(config(), ARGS)
  assert.equal(res.ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, URL)
  const body = JSON.parse(String(calls[0].init.body))
  assert.equal(body.isTest, true)
  assert.equal(body.recipient, ARGS.recipient)
  assert.equal(body.subject, ARGS.subject)
  assert.equal(body.html, ARGS.html)
  assert.equal(body.emailName, ARGS.emailName)
  assert.equal(body.source, 'Ninety One Email Briefing')
  assert.ok(!Number.isNaN(Date.parse(body.triggeredAt)), 'triggeredAt must be an ISO date')
})

test('is refused when the master toggle is off', async () => {
  const res = await triggerTestEmail(config({ enabled: false }), ARGS)
  assert.equal(res.ok, false)
  assert.match((res as { error: string }).error, /disabled/i)
  assert.equal(calls.length, 0)
})

test('is refused when the flow itself is disabled', async () => {
  const res = await triggerTestEmail(
    config({ testEmailFlow: { webhookUrl: URL, enabled: false } }), ARGS)
  assert.equal(res.ok, false)
  assert.equal(calls.length, 0)
})

test('is refused when the flow has no url', async () => {
  const res = await triggerTestEmail(
    config({ testEmailFlow: { webhookUrl: '', enabled: true } }), ARGS)
  assert.equal(res.ok, false)
  assert.equal(calls.length, 0)
})

test('surfaces the status and body when the flow rejects the request', async () => {
  stubFetch(502, 'gateway')
  const res = await triggerTestEmail(config(), ARGS)
  assert.equal(res.ok, false)
  assert.match((res as { error: string }).error, /502/)
  assert.match((res as { error: string }).error, /gateway/)
})

test('a long flow error is shown whole, so the field it names is not cut off, and a huge one is capped', async () => {
  const schemaError = JSON.stringify({ error: { code: 'TriggerInputSchemaMismatch', message: `The input body for trigger 'manual' of type 'Request' did not match its schema definition. Error details: 'Invalid type. Expected String but got Array. Path 'region', line 1, position ${'9'.repeat(300)}'.` } })
  assert.ok(schemaError.length > 400)
  stubFetch(400, schemaError)
  const res = await triggerTestEmail(config(), ARGS)
  assert.ok((res as { error: string }).error.includes("Path 'region'"), 'the field named at the end of the message is kept')
  stubFetch(400, 'x'.repeat(5000))
  const huge = (await triggerTestEmail(config(), ARGS)) as { error: string }
  assert.ok(huge.error.length < 2200, 'an enormous body is still capped')
})

const CHECKLIST_ARGS = {
  briefId: 'b1',
  emailName: '1026 SA Advisor Impact',
  recipients: ['a@ninetyone.com', 'b@ninetyone.com'],
  subject: 'Pre-send checklist: 1026 SA Advisor Impact',
  bodyHtml: '<table><tr><td>Checklist</td></tr></table>',
  attachments: [{ name: 'email.html', type: 'text/html', base64: 'PGh0bWw+' }],
  requesterName: 'Sam',
  requesterEmail: 's@ninetyone.com',
}
const checklistConfig = (over: Partial<PowerAutomateConfig> = {}) => config({ checklistFlow: { webhookUrl: URL, enabled: true }, ...over })

test('the pre-send checklist goes to its own flow with the recipients, the body and the email attached', async () => {
  const res = await triggerChecklistSend(checklistConfig(), CHECKLIST_ARGS)
  assert.equal(res.ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, URL)
  const body = JSON.parse(String(calls[0].init.body))
  assert.equal(body.kind, 'pre_send_checklist')
  assert.deepEqual(body.recipients, ['a@ninetyone.com', 'b@ninetyone.com'])
  assert.equal(body.recipientsText, 'a@ninetyone.com;b@ninetyone.com', 'one string for the flow\'s To field')
  assert.equal(body.subject, CHECKLIST_ARGS.subject)
  assert.equal(body.bodyHtml, CHECKLIST_ARGS.bodyHtml)
  assert.deepEqual(body.attachments, CHECKLIST_ARGS.attachments)
  assert.equal(body.briefId, 'b1')
  assert.equal(body.requesterEmail, 's@ninetyone.com')
})

test('the checklist is refused, and nothing is sent, when it is switched off, has no address, or has nobody to go to', async () => {
  assert.equal((await triggerChecklistSend(checklistConfig({ enabled: false }), CHECKLIST_ARGS) as { ok: boolean }).ok, false)
  assert.equal((await triggerChecklistSend(config({ checklistFlow: { webhookUrl: URL, enabled: false } }), CHECKLIST_ARGS) as { ok: boolean }).ok, false)
  assert.equal((await triggerChecklistSend(config({ checklistFlow: { webhookUrl: '', enabled: true } }), CHECKLIST_ARGS) as { ok: boolean }).ok, false)
  const none = await triggerChecklistSend(checklistConfig(), { ...CHECKLIST_ARGS, recipients: [] }) as { ok: false; error: string }
  assert.match(none.error, /recipient/i)
  assert.equal(calls.length, 0)
})

test('the checklist flow is ready only when the master toggle, the flow and its url are all set', () => {
  assert.equal(isChecklistFlowReady(checklistConfig()), true)
  assert.equal(isChecklistFlowReady(checklistConfig({ enabled: false })), false)
  assert.equal(isChecklistFlowReady(config({ checklistFlow: { webhookUrl: '  ', enabled: true } })), false)
  assert.equal(isChecklistFlowReady(config({ checklistFlow: { webhookUrl: URL, enabled: false } })), false)
})

test('sends the shared secret as a header and never in the body', async () => {
  await triggerTestEmail(
    config({ secretHeaderName: 'x-api-key', secretHeaderValue: 'topsecret' }), ARGS)
  const headers = calls[0].init.headers as Record<string, string>
  assert.equal(headers['x-api-key'], 'topsecret')
  assert.ok(!String(calls[0].init.body).includes('topsecret'),
    'the secret must not appear in the request body')
})

test('the test-email flow is ready only when the master toggle, the flow and its url are all set', () => {
  assert.equal(isTestEmailFlowReady(config()), true)
  assert.equal(isTestEmailFlowReady(config({ enabled: false })), false)
  assert.equal(isTestEmailFlowReady(
    config({ testEmailFlow: { webhookUrl: URL, enabled: false } })), false)
  assert.equal(isTestEmailFlowReady(
    config({ testEmailFlow: { webhookUrl: '   ', enabled: true } })), false)
})

// Only the fields triggerBriefSubmission reads.
const BRIEF = {
  meta: { briefId: 'b-1', status: 'submitted' },
  campaign: {
    campaignName: 'Taking Stock', emailType: 'newsletter', theme: 'agulhas-coral',
    subjectLine: 'Q2 outlook', previewText: 'p', fromName: 'Ninety One', replyToEmail: 'a@b.co',
  },
  audience: { region: ['ZA'], channel: ['INTERMEDIARY'], pardotListId: '123' },
  content: { headline: 'Headline', cta: { label: 'Read', url: 'https://example.com' } },
  deadlines: { sendDate: '2026-11-01', contentApprovalDate: '2026-10-25', urgency: 'standard', notes: '' },
} as unknown as BriefPayload

const SUBMIT = { briefSubmissionFlow: { webhookUrl: URL, enabled: true } }

test('the brief submission carries the rendered html, brief html, text version and email name', async () => {
  const res = await triggerBriefSubmission(config(SUBMIT), BRIEF, {
    html: '<html>email</html>', briefHtml: '<html>brief</html>',
    textEmail: 'plain text', emailName: 'Taking Stock Q2',
  })
  assert.equal(res.ok, true)
  const body = JSON.parse(String(calls[0].init.body))
  assert.equal(body.html, '<html>email</html>')
  assert.equal(body.briefHtml, '<html>brief</html>')
  assert.equal(body.textEmail, 'plain text')
  assert.equal(body.emailName, 'Taking Stock Q2')
  assert.equal(body.briefId, 'b-1')
})

test('the brief-submission flow is ready only when the master toggle, the flow and its url are all set', () => {
  assert.equal(isBriefSubmissionFlowReady(config(SUBMIT)), true)
  assert.equal(isBriefSubmissionFlowReady(config()), false)
  assert.equal(isBriefSubmissionFlowReady(config({ ...SUBMIT, enabled: false })), false)
  assert.equal(isBriefSubmissionFlowReady(
    config({ briefSubmissionFlow: { webhookUrl: ' ', enabled: true } })), false)
})

test('the brief submission carries the draft recipient, subject and attachments for the flow', async () => {
  const attachments = [{ name: 'email.html', type: 'text/html', base64: 'PGh0bWw+' }]
  await triggerBriefSubmission(config(SUBMIT), BRIEF, {
    emailName: 'Q2', draftTo: 'steven.jacobs@ninetyone.com', draftSubject: 'Q2', attachments,
  })
  const body = JSON.parse(String(calls[0].init.body))
  assert.equal(body.draftTo, 'steven.jacobs@ninetyone.com')
  assert.equal(body.draftSubject, 'Q2')
  assert.deepEqual(body.attachments, attachments)
})

test('the brief submission carries who requested the email, by name and address', async () => {
  await triggerBriefSubmission(config(SUBMIT), BRIEF, { submittedBy: 'Sam Lee', requesterName: 'Sam Lee', requesterEmail: 'sam.lee@ninetyone.com' })
  const body = JSON.parse(String(calls[calls.length - 1].init.body))
  assert.equal(body.requesterEmail, 'sam.lee@ninetyone.com')
  assert.equal(body.requesterName, 'Sam Lee')
})

test('the brief submission carries the whole summary as the HTML body of the draft email', async () => {
  await triggerBriefSubmission(config(SUBMIT), BRIEF, { draftTo: 'a@b.co', draftSubject: 'Q2', draftBody: '<div>the summary</div>' })
  assert.equal(JSON.parse(String(calls[calls.length - 1].init.body)).draftBody, '<div>the summary</div>')
})
