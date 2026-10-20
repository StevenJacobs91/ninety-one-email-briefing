import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTags } from './tags.ts'
import type { BriefFormData } from './schema.ts'

const data = {
  audience: { clientGroup: ['Intermediary'], region: ['ZA', 'UK'], channel: ['INTERMEDIARY'] },
  campaign: { campaignName: 'Important information', emailType: 'operational', theme: 'springbok-teal' },
} as unknown as BriefFormData
const themes = [{ id: 'springbok-teal', label: 'Springbok Cream / Ocean Teal' }] as never

test('builds the comma-separated tag string in the platform format', () => {
  assert.equal(
    buildTags(data, themes, new Date(2026, 9, 20)),
    [
      'parent - 1026 za uk intermediary important information',
      'email - primary',
      'client group - intermediary',
      'region - za uk',
      'audience - intermediary',
      'campaign - important information',
      'email type - operational',
      'colour theme - springbok cream and ocean teal',
    ].join(', '),
  )
})

test('missing audience and campaign fall back to tbd and untitled', () => {
  const empty = { audience: { clientGroup: [], region: [], channel: [] }, campaign: { campaignName: '', emailType: '', theme: '' } } as unknown as BriefFormData
  const out = buildTags(empty, [], new Date(2026, 0, 5))
  assert.ok(out.startsWith('parent - 0126 tbd tbd untitled'))
  assert.ok(out.includes('campaign - untitled'))
})
