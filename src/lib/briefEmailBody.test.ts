import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateBriefEmailBody } from './generateBriefHtml.ts'
import { nonHexColours } from './hexColours.ts'

const BRIEF = {
  meta: { briefId: 'b-1', status: 'submitted' },
  campaign: {
    campaignName: 'Taking Stock', emailType: 'newsletter', theme: 'agulhas-gold',
    subjectLine: 'Introducing our new online platform', previewText: 'Passive investment products', fromName: 'Ninety One', fromAddress: 'no-reply@ninetyone.com', replyToEmail: 'a@b.co',
  },
  audience: { clientGroup: ['Southern Africa'], region: ['ZA'], channel: ['INTERMEDIARY'] },
  content: { headline: 'A <new> platform', bodyIntro: 'Hello', sections: [], cta: { label: 'Read more', url: 'https://example.com', openInNewTab: true }, includeUnsubscribe: true },
  assets: { logoVariant: 'horizontal', additionalAssetUrls: [] },
  deadlines: { contentApprovalDate: '2026-10-20', sendDate: '2026-10-30', urgency: 'standard', notes: 'Please hurry' },
} as never

test('the email body holds every part of the summary, escaped', () => {
  const html = generateBriefEmailBody(BRIEF)
  for (const text of ['Campaign', 'Audience', 'Assets', 'Content', 'Deadlines', 'Introducing our new online platform', 'Southern Africa', 'no-reply@ninetyone.com', 'Please hurry', '30 October 2026']) {
    assert.ok(html.includes(text), text)
  }
  assert.ok(html.includes('A &lt;new&gt; platform'))
})

test('it is a fragment with every style on the element, which a mail client keeps', () => {
  const html = generateBriefEmailBody(BRIEF)
  assert.ok(!/<(html|head|body|style)\b/i.test(html))
  assert.ok(!/\sclass=/.test(html), 'no class that would need a stylesheet')
  assert.ok(html.includes('background:#221b3b'), 'the theme colour is on the header')
  assert.deepEqual(nonHexColours(html), [], 'colours are hex')
})
