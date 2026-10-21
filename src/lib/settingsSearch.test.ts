import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assetSearchParts, campaignSearchParts, matchesSearch } from './settingsSearch.ts'
import type { AssetEntry, CampaignEntry } from '../types/settings.types'

test('an empty or blank search matches everything', () => {
  assert.equal(matchesSearch('', ['anything']), true)
  assert.equal(matchesSearch('   ', ['anything']), true)
})

test('matching ignores case and finds part of a word', () => {
  assert.equal(matchesSearch('QUARTER', ['Quarterly Market Update']), true)
  assert.equal(matchesSearch('market upd', ['Quarterly Market Update']), true)
})

test('every word must be found, in any order, across any of the fields', () => {
  const parts = ['Taking Stock', ['Southern Africa', 'Advisor']]
  assert.equal(matchesSearch('advisor stock', parts), true)
  assert.equal(matchesSearch('advisor retail', parts), false)
})

test('missing fields are ignored', () => {
  assert.equal(matchesSearch('x', [undefined, null, 'xylophone']), true)
  assert.equal(matchesSearch('x', [undefined, null]), false)
})

const campaign: CampaignEntry = {
  id: 'c1', name: 'Taking Stock', regions: ['Southern Africa'], channels: ['Advisor'], clientGroups: ['Institutional'],
  senderPreset: { fromName: 'Ninety One Taking Stock', fromAddress: 'SA.Advisor@ninetyone.com', replyToEmail: 'reply@ninetyone.com' },
  contentPreset: {
    theme: 'marula-coral', subjectLine: '# | Taking Stock', previewText: 'Quarterly view', heroImageUrl: '', headline: 'Markets in focus', subHeadline: '',
    signatureId: '', disclaimerId: '', distributionList: 'Taking Stock Publication', pardotListId: '',
  },
  pardotCampaignId: '139848',
}

test('a campaign is found by its name, audience, sender, content and Pardot id', () => {
  for (const q of ['taking', 'southern africa', 'institutional', 'sa.advisor@', 'quarterly', 'publication', '139848']) {
    assert.equal(matchesSearch(q, campaignSearchParts(campaign)), true, q)
  }
  assert.equal(matchesSearch('retail', campaignSearchParts(campaign)), false)
})

test('a campaign is found by the readable name of its theme, not just its id', () => {
  assert.equal(matchesSearch('cape coral', campaignSearchParts(campaign, 'Marula Green / Cape Coral')), true)
  assert.equal(matchesSearch('cape coral', campaignSearchParts(campaign)), false)
})

const asset: AssetEntry = { id: 'a1', name: '706930897', url: 'https://cdn.example.com/h/706930897.jpg', category: 'header', colourOverlay: '#221b3b', altText: 'Ninety One header 706930897' }

test('an asset is found by name, alt text, address, colour and category', () => {
  for (const q of ['7069', 'ninety one header', 'cdn.example', '#221b3b', 'header']) {
    assert.equal(matchesSearch(q, assetSearchParts(asset)), true, q)
  }
  assert.equal(matchesSearch('elephants', assetSearchParts(asset)), false)
})
