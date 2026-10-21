import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  briefSubmittedNotification,
  submissionBriefId,
  DRAFT_RECIPIENT, buildEml, submissionFiles, boardLinks, boardNotes, textToBase64,
} from './submissionDraft.ts'

const files = [
  { name: 'email-q2.html', type: 'text/html', base64: textToBase64('<html>email</html>') },
  { name: 'brief-q2.html', type: 'text/html', base64: textToBase64('<html>brief</html>') },
]

test('the draft goes to the requested address', () => {
  assert.equal(DRAFT_RECIPIENT, 'steven.jacobs@ninetyone.com')
})

test('the .eml is an unsent draft to the recipient with the subject and every attachment', () => {
  const eml = buildEml({ to: DRAFT_RECIPIENT, subject: 'Q2 Update', body: 'Hello', attachments: files })
  assert.match(eml, /^X-Unsent: 1\r\n/m)
  assert.match(eml, /^To: steven\.jacobs@ninetyone\.com\r\n/m)
  assert.match(eml, /^Subject: Q2 Update\r\n/m)
  assert.match(eml, /Content-Type: multipart\/mixed; boundary="/)
  assert.equal((eml.match(/Content-Disposition: attachment; filename="/g) ?? []).length, 2)
  assert.ok(eml.includes('filename="email-q2.html"') && eml.includes('filename="brief-q2.html"'))
})

test('a non-ASCII subject is encoded so mail clients show it correctly', () => {
  const eml = buildEml({ to: DRAFT_RECIPIENT, subject: 'Café — Update', body: 'x', attachments: [] })
  const line = eml.split('\r\n').find((l) => l.startsWith('Subject:'))!
  assert.match(line, /^Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/)
  const b64 = line.match(/\?B\?(.*)\?=/)![1]
  assert.equal(Buffer.from(b64, 'base64').toString('utf8'), 'Café — Update')
})

test('attachment data is base64 wrapped at 76 characters and survives a round trip', () => {
  const big = 'x'.repeat(5000)
  const eml = buildEml({ to: DRAFT_RECIPIENT, subject: 's', body: 'b', attachments: [{ name: 'a.txt', type: 'text/plain', base64: textToBase64(big) }] })
  const dataLines = eml.split('\r\n').filter((l) => /^[A-Za-z0-9+/=]{20,}$/.test(l))
  assert.ok(dataLines.every((l) => l.length <= 76))
  assert.equal(Buffer.from(dataLines.join(''), 'base64').toString('utf8'), big)
})

test('quotes in a filename cannot break out of the header', () => {
  const eml = buildEml({ to: DRAFT_RECIPIENT, subject: 's', body: 'b', attachments: [{ name: 'a"b.txt', type: 'text/plain', base64: '' }] })
  assert.ok(eml.includes('filename="a_b.txt"'))
})

test('the submission files are named from the campaign and date', () => {
  const f = submissionFiles('Important Information', '2026-10-20')
  assert.equal(f.email, 'email-important-information-2026-10-20.html')
  assert.equal(f.summary, 'brief-summary-important-information-2026-10-20.html')
})

test('board links point at the saved brief in the app', () => {
  const l = boardLinks('https://app.example.com', 'abc-123')
  assert.equal(l.html, 'https://app.example.com/?brief=abc-123&view=html')
  assert.equal(l.summary, 'https://app.example.com/?brief=abc-123&view=summary')
})

test('card notes say who created it and carry both links', () => {
  const links = boardLinks('https://app.example.com', 'abc-123')
  const notes = boardNotes({ createdByName: 'Steven Jacobs', createdByEmail: 'steven@x.com', links, at: new Date('2026-10-20T10:00:00Z') })
  assert.match(notes, /Created by: Steven Jacobs \(steven@x\.com\)/)
  assert.ok(notes.includes(links.html) && notes.includes(links.summary))
})

test('a brief that is not on the board yet keeps its id', () => {
  assert.equal(submissionBriefId('a', new Set(['b']), () => 'fresh'), 'a')
})

test('a brief whose id is already on the board gets a fresh id, so the new submission is added instead of skipped', () => {
  assert.equal(submissionBriefId('a', new Set(['a']), () => 'fresh'), 'fresh')
})

test('a fresh id that also collides is replaced until it is unused', () => {
  const ids = ['a', 'b', 'c']
  assert.equal(submissionBriefId('a', new Set(['a', 'b']), () => ids.shift()!), 'c')
})

const notifyOpts = {
  briefId: 'b1', campaignName: 'Q3 update', emailName: '2026-10-21 Q3 update', emailType: 'campaign', subjectLine: 'Hello',
  sendDate: '2026-11-01', contentApprovalDate: '2026-10-28', urgency: 'standard',
  regions: ['ZA', 'UK'], channels: ['INTERMEDIARY'], requesterName: 'Ayesha Khan', requesterEmail: 'ayesha@ninetyone.com',
  links: { html: 'https://app/?brief=b1&view=html', summary: 'https://app/?brief=b1&view=summary' },
  html: '<html>email</html>', briefHtml: '<html>brief</html>', textEmail: 'plain',
  attachments: [{ name: 'email.html', type: 'text/html', base64: 'PGh0bWw+' }, { name: 'brief.html', type: 'text/html', base64: 'PGI+' }],
}

test('the brief_submitted notification keeps its existing fields, with regions and channels as text', () => {
  const p = briefSubmittedNotification(notifyOpts)
  assert.equal(p.briefId, 'b1')
  assert.equal(p.campaignName, 'Q3 update')
  assert.equal(p.regions, 'ZA, UK')
  assert.equal(p.channels, 'INTERMEDIARY')
  assert.equal(p.requesterEmail, 'ayesha@ninetyone.com')
})

test('the brief_submitted notification carries the email HTML, the summary and the attachments for Power Automate', () => {
  const p = briefSubmittedNotification(notifyOpts)
  assert.equal(p.emailName, '2026-10-21 Q3 update')
  assert.equal(p.html, '<html>email</html>')
  assert.equal(p.briefHtml, '<html>brief</html>')
  assert.equal(p.textEmail, 'plain')
  assert.equal(p.emailHtmlUrl, 'https://app/?brief=b1&view=html')
  assert.equal(p.briefSummaryUrl, 'https://app/?brief=b1&view=summary')
  assert.equal(p.attachmentCount, 2)
  assert.deepEqual(p.attachments, notifyOpts.attachments)
})
