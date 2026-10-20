import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_POWER_AUTOMATE_CONFIG, createDefaultSettings } from './settingsDefaults.ts'

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

test('a stored blob still carrying n8nWebhookUrl merges without error', () => {
  // Saved blobs predate the removal. SettingsContext merges them over the
  // defaults with a spread, so the stale key must be tolerated, not thrown on.
  const stored = { n8nWebhookUrl: 'https://old.n8n.example/hook' }
  const merged = { ...createDefaultSettings(), ...stored }
  assert.equal(merged.powerAutomate.testEmailFlow.enabled, false)
})
