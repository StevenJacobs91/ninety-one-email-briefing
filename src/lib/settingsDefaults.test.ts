import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_POWER_AUTOMATE_CONFIG } from './settingsDefaults.ts'

test('a fresh config carries a disabled test-email flow', () => {
  assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG.testEmailFlow,
    { webhookUrl: '', enabled: false })
})

test('the three existing flows are untouched', () => {
  for (const k of ['briefSubmissionFlow', 'listAnalysisFlow', 'campaignInsightsFlow'] as const) {
    assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG[k], { webhookUrl: '', enabled: false })
  }
})
