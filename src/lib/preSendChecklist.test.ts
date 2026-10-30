import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildChecklist, canSeeChecklist, checklistHtml, checklistRecipients, checklistSettings, checklistSubject, parseRecipients } from './preSendChecklist.ts'
import { parse } from './moduleEngine/fixtures.ts'

const EMAIL = `<table><tbody>
<tr><td><p>{{#if Recipient.LastName}} Dear {{Recipient.LastName}},{{else}} Hello,{{/if}}</p>
<p>For much of the past decade, see our <a href="https://x.com/guide?utm_campaign=advisor-impact">guide</a> to offshore investing for more.</p></td></tr>
<tr><td><table><tbody><tr><td>
  <h3>Global ETFs added to your toolkit</h3>
  <p>Where clients can hold them, how they are traded and more.</p>
  <a class="button-copy" href="https://x.com/etfs?utm_content=secondary-cta&amp;utm_campaign=advisor-impact">5-minute read</a>
</td></tr></tbody></table></td></tr>
<tr><td><h3>The CGT bill your clients’ heirs may not see coming</h3><p>CGT on death – will a cash shortfall arise?</p><a href="https://x.com/cgt">6-minute read</a>
<a href="https://x.com/cgt">6-minute read</a></td></tr>
<tr><td><p style="font-family: Ninety One Visuelt Display, arial;">AI-enabled advisor series</p><p>Technology Enablement Lead explores some practical ways in which AI can support your business.</p><p style="font-family: Ninety One Visuelt Display, arial;">Serita discusses:<br>— Introduction to AI tools</p></td></tr>
<tr><td class="button-copy"><p><a href="https://x.com/ai#features">5-minute watch</a></p></td></tr>
<tr><td><p>We trust you will find the content interesting. Thank you for your support.</p><p>Kind regards,</p><p>David Stronach<br>Deputy Managing Director and Head of SA Advisor<br><a href="https://www.ninetyone.com/">www.ninetyone.com</a></p></td></tr>
<tr><td><a href="https://x.com/visit">Visit website</a> <a href="https://x.com/view">View online</a> <a href="https://x.com/privacy-notice">Privacy notice</a> <a href="https://x.com/li"><img alt="LinkedIn" src="https://x.com/i.png"></a></td></tr>
<tr><td><p class="disclaimer-copy">All information and opinions provided are of a general nature.</p>
<p class="disclaimer-copy">If you no longer wish to receive any emails from Ninety One, you are welcome to <a href="{{Unsubscribe}}">unsubscribe here</a>.</p></td></tr>
</tbody></table>`

const brief = {
  meta: { briefId: 'b1' },
  campaign: {
    emailDescription: 'October edition', emailType: 'newsletter', campaignName: 'Advisor Impact', theme: 'agulhas-gold',
    subjectLine: 'Global ETFs on the platform & the CGT bill', previewText: 'Offshore allowance deadlines.', senderType: 'general',
    fromName: 'David Stronach', fromAddress: 'ipadvisor@ninetyone.com', utmCampaign: 'advisor-impact',
  },
  audience: { clientGroup: ['Africa'], region: ['South Africa'], channel: ['Investment Platform'], distributionLists: [{ name: 'IP distribution list.csv', size: 1, type: 'text/csv' }] },
  content: { headline: 'Advisor Impact', subHeadline: 'Investment Platform update', greetingId: 'g1' },
  deadlines: { sendDate: '2026-10-28' },
} as never

const settings = {
  greetings: [{ id: 'g1', label: 'Advisor', value: '{{#if Recipient.Broker_Preferred_Name}} Dear {{Recipient.Broker_Preferred_Name}},{{else}} Dear {{Recipient.FirstName}},{{/if}}', isDefault: false }],
  brandThemes: [{ id: 'agulhas-gold', label: 'Agulhas Indigo / Gazania Gold' }],
} as never

const model = () => buildChecklist({ brief, emailHtml: EMAIL, settings, parse, now: new Date(2026, 9, 28) })

test('the checklist is filled in from the brief and from the email as it will be sent', () => {
  const m = model()
  assert.match(m.draftName, /^Draft: \d{4} SA Investment Platform Advisor Impact - October edition$/)
  assert.equal(m.sendDate, '28-10-2026')
  assert.equal(m.sendingProfile, 'David Stronach <ipadvisor@ninetyone.com>')
  assert.equal(m.utmCampaign, 'advisor-impact')
  assert.equal(m.subjectLine, 'Global ETFs on the platform & the CGT bill')
  assert.equal(m.previewLine, 'Offshore allowance deadlines.')
  assert.deepEqual(m.title, ['Advisor Impact', 'Investment Platform update'])
  assert.equal(m.greeting, '{{#if Recipient.Broker_Preferred_Name}} Dear {{Recipient.Broker_Preferred_Name}},{{else}} Dear {{Recipient.FirstName}},{{/if}}')
  assert.equal(m.listName, 'IP distribution list')
  assert.match(m.basicTags, /^parent - .*colour theme - agulhas indigo and gazania gold$/)
})

test('the signature is the sign-off message and signature as they read in the email', () => {
  assert.deepEqual(model().signature, [
    'We trust you will find the content interesting. Thank you for your support.',
    'Kind regards,',
    'David Stronach\nDeputy Managing Director and Head of SA Advisor\nwww.ninetyone.com',
  ])
})

test('the below-the-line disclaimer is the email\'s disclaimer with the unsubscribe merge tag shown, and there is no above-the-line one', () => {
  const m = model()
  assert.equal(m.atlDisclaimer, '-')
  assert.deepEqual(m.btlDisclaimer, [
    'All information and opinions provided are of a general nature.',
    'If you no longer wish to receive any emails from Ninety One, you are welcome to unsubscribe here: {{Unsubscribe}}.',
  ])
})

test('the links are the ones in the text, then each call to action with its heading and words; footer, logo and signature links are left out', () => {
  const { inline, blocks } = model().links
  assert.deepEqual(inline, [{ label: 'guide', url: 'https://x.com/guide?utm_campaign=advisor-impact' }])
  assert.deepEqual(blocks, [
    { title: 'Global ETFs added to your toolkit', description: ['Where clients can hold them, how they are traded and more.'], items: [{ label: '5-minute read', url: 'https://x.com/etfs?utm_content=secondary-cta&utm_campaign=advisor-impact' }] },
    { title: 'The CGT bill your clients’ heirs may not see coming', description: ['CGT on death – will a cash shortfall arise?'], items: [{ label: '6-minute read', url: 'https://x.com/cgt' }] },
    {
      title: 'AI-enabled advisor series',
      description: ['Technology Enablement Lead explores some practical ways in which AI can support your business.', 'Serita discusses:\n— Introduction to AI tools'],
      items: [{ label: '5-minute watch', url: 'https://x.com/ai#features' }],
    },
  ])
})

test('what Pardot supplies is left blank for whoever completes the checklist', () => {
  const m = model()
  assert.equal(m.totalProspects, '')
  assert.equal(m.mailableProspects, '')
  assert.equal(m.completionTags, '')
  assert.equal(m.completionActions, '')
})

test('the checklist reads as the template: its six sections in order, values escaped, blank fields left empty', () => {
  const html = checklistHtml(model())
  assert.ok(html.includes('EMAIL PRE-SEND APPROVAL CHECKLIST'))
  const at = ['1. CAMPAIGN DETAILS', '2. SUBJECT LINE &amp; PREVIEW', '3. CONTENT', '4. LINKS &amp; CTAS', '5. AUDIENCE', '6. TAGGING'].map((h) => html.indexOf(h))
  assert.ok(at.every((i) => i > -1) && [...at].sort((a, b) => a - b).join() === at.join(), 'all six, in order')
  assert.ok(html.includes('Global ETFs on the platform &amp; the CGT bill'), 'values are escaped')
  assert.ok(html.includes('{{#if Recipient.Broker_Preferred_Name}}'), 'merge tags are shown as written')
  assert.match(html, /data-field="totalProspects"[^>]*>(?:&nbsp;)?<\/td>/)
  assert.match(html, /data-field="completionActions"[^>]*>(?:&nbsp;)?<\/td>/)
  assert.ok(!/<script/i.test(html))
})

test('settings fall back to producers and admins, no recipients and a subject naming the email', () => {
  const s = checklistSettings(undefined)
  assert.deepEqual(s.visibleTo, ['producer', 'admin'])
  assert.deepEqual(s.recipients, [])
  assert.equal(s.enabled, true)
  assert.equal(checklistSubject(s, '1026 SA Advisor Impact'), 'Pre-send checklist: 1026 SA Advisor Impact')
  assert.equal(checklistSettings({ preSendChecklist: { recipients: ['a@x.com'] } } as never).visibleTo.join(), 'producer,admin', 'a saved partial setting keeps the other defaults')
  assert.deepEqual(checklistRecipients({ preSendChecklist: { recipients: ['a@x.com'] } } as never), ['a@x.com'])
})

test('who sees the buttons: the roles chosen in Settings, a custom role on its own terms, and nobody when it is off', () => {
  const none = undefined
  assert.equal(canSeeChecklist(none, { role: 'producer', customRoleId: null }), true)
  assert.equal(canSeeChecklist(none, { role: 'admin', customRoleId: null }), true)
  assert.equal(canSeeChecklist(none, { role: 'requester', customRoleId: null }), false)
  assert.equal(canSeeChecklist(none, null), false)
  const custom = { preSendChecklist: { visibleTo: ['producer', 'role-abc'] } } as never
  assert.equal(canSeeChecklist(custom, { role: 'requester', customRoleId: 'role-abc' }), true)
  assert.equal(canSeeChecklist(custom, { role: 'producer', customRoleId: 'role-xyz' }), false, 'a custom role not listed does not borrow its base role')
  assert.equal(canSeeChecklist({ preSendChecklist: { enabled: false } } as never, { role: 'producer', customRoleId: null }), false)
})

test('recipients are read from a pasted list, each once, and the ones that are not addresses are reported', () => {
  assert.deepEqual(parseRecipients('a@x.com, B@x.com;\n a@x.com  c@y.co.za').valid, ['a@x.com', 'B@x.com', 'c@y.co.za'])
  assert.deepEqual(parseRecipients('a@x.com, nobody, @bad').invalid, ['nobody', '@bad'])
  assert.deepEqual(parseRecipients('').valid, [])
})
