import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_POWER_AUTOMATE_CONFIG, createDefaultSettings, mergePowerAutomate,
} from './settingsDefaults.ts'
import { isTestEmailFlowReady } from './powerAutomateService.ts'
import type { PowerAutomateConfig } from '../types/settings.types'

test('a fresh config carries a disabled test-email flow', () => {
  assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG.testEmailFlow,
    { webhookUrl: '', enabled: false })
})

test('the three existing flows are untouched', () => {
  for (const k of ['briefSubmissionFlow', 'listAnalysisFlow', 'campaignInsightsFlow'] as const) {
    assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG[k], { webhookUrl: '', enabled: false })
  }
})

test('the n8n webhook setting is gone from fresh defaults', () => {
  assert.ok(!('n8nWebhookUrl' in createDefaultSettings()))
})

// A config saved before testEmailFlow existed: the other flows and the master
// toggle are set, the new endpoint is simply absent.
const STORED_BEFORE_TEST_EMAIL = {
  enabled: true,
  briefSubmissionFlow: { webhookUrl: 'https://flow.test/brief?sig=abc', enabled: true },
  listAnalysisFlow: { webhookUrl: '', enabled: false },
  campaignInsightsFlow: { webhookUrl: '', enabled: false },
  secretHeaderName: 'x-api-key',
  secretHeaderValue: 'kept',
} as unknown as Partial<PowerAutomateConfig>

test('a saved config without testEmailFlow gains the default and keeps what was saved', () => {
  const merged = mergePowerAutomate(STORED_BEFORE_TEST_EMAIL)
  assert.deepEqual(merged.testEmailFlow, { webhookUrl: '', enabled: false })
  assert.equal(merged.briefSubmissionFlow.webhookUrl, 'https://flow.test/brief?sig=abc')
  assert.equal(merged.briefSubmissionFlow.enabled, true)
  assert.equal(merged.enabled, true)
  assert.equal(merged.secretHeaderValue, 'kept')
})

test('the readiness check does not throw on a config saved before testEmailFlow existed', () => {
  // The crash this pins: the master toggle is on, the new flow object is
  // missing, and reading flow.enabled threw during render of the HTML step.
  assert.equal(isTestEmailFlowReady(mergePowerAutomate(STORED_BEFORE_TEST_EMAIL)), false)
})

test('a saved flow endpoint missing a field takes that field from the default', () => {
  const merged = mergePowerAutomate({
    testEmailFlow: { webhookUrl: 'https://flow.test/t?sig=1' },
  } as unknown as Partial<PowerAutomateConfig>)
  assert.equal(merged.testEmailFlow.webhookUrl, 'https://flow.test/t?sig=1')
  assert.equal(merged.testEmailFlow.enabled, false)
})

test('no saved config at all yields the defaults', () => {
  assert.deepEqual(mergePowerAutomate(undefined), DEFAULT_POWER_AUTOMATE_CONFIG)
})
