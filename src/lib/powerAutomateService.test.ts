import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { triggerTestEmail, isTestEmailFlowReady } from './powerAutomateService.ts'
import { DEFAULT_POWER_AUTOMATE_CONFIG } from './settingsDefaults.ts'
import type { PowerAutomateConfig } from '../types/settings.types'

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
