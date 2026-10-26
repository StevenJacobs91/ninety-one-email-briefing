import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBrandGuardianReview } from './brandGuardian.ts'
import type { BriefPayload } from '../types/brief.types.ts'

const brief = (campaign: Record<string, unknown>): BriefPayload => ({
  meta: { briefId: 'b', createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', status: 'draft' },
  campaign: { emailDescription: '', emailType: 'newsletter', campaignName: 'Taking Stock', theme: 'leatherback-coral', subjectLine: 'Hello', previewText: 'Preview', replyToEmail: '', ...campaign },
  audience: { clientGroup: ['Advisor'], region: ['ZA'], channel: ['INTERMEDIARY'], pardotListId: '', distributionLists: [] },
  content: { headline: '', subHeadline: '', bodyIntro: '', sections: [], modules: [], moduleNotes: {}, cta: { label: '', url: '', openInNewTab: true }, legalDisclaimer: '', includeUnsubscribe: true },
  htmlEdits: [],
  assets: { headerType: 'standard', logoVariant: 'horizontal', stripeColour: '', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
  deadlines: { contentApprovalDate: '', sendDate: '2026-11-01', urgency: 'standard', oneOnOneRequired: false, notes: '', tags: '' },
} as unknown as BriefPayload)

const fields = (b: BriefPayload) => runBrandGuardianReview(b).items.map((i) => i.field)

test('a general user send is checked on its from name and from address', () => {
  const found = fields(brief({ senderType: 'general', fromName: 'Ninety One', fromAddress: 'a@ninetyone.com' }))
  assert.ok(found.includes('campaign.fromName'))
  assert.ok(found.includes('campaign.fromAddress'))
})

test('a brief from before sender types existed is checked the same way', () => {
  const found = fields(brief({ fromName: 'Ninety One', fromAddress: 'a@ninetyone.com' }))
  assert.ok(found.includes('campaign.fromName'))
})

test('a specific or assigned user send has no from name or address to check, so nothing is flagged for them', () => {
  for (const senderType of ['specific', 'assigned']) {
    const found = fields(brief({ senderType, specificUser: '123', fromName: '', fromAddress: '' }))
    assert.ok(!found.includes('campaign.fromName'), `${senderType} from name`)
    assert.ok(!found.includes('campaign.fromAddress'), `${senderType} from address`)
  }
})
