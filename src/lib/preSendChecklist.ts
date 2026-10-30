import type { BriefPayload } from '../types/brief.types'
import type { AppSettings, PreSendChecklistSettings } from '../types/settings.types'
import type { BriefFormData } from './schema'
import type { ParseDoc } from './moduleEngine/regions'
import { SIGN_OFF_WORDS } from './moduleEngine/footer'
import { buildEmailName } from './emailName'
import { buildTags } from './tags'
import { senderLine } from './senderSummary'

// ─── Settings: who sees the buttons, and who it goes to ─────────────────────────────────────────────

export const DEFAULT_CHECKLIST_SETTINGS: PreSendChecklistSettings = {
  enabled: true,
  visibleTo: ['producer', 'admin'],
  recipients: [],
  subjectTemplate: 'Pre-send checklist: {{emailName}}',
}

/** The checklist settings, with the default for anything not saved. */
export function checklistSettings(settings: Pick<AppSettings, 'preSendChecklist'> | undefined): PreSendChecklistSettings {
  return { ...DEFAULT_CHECKLIST_SETTINGS, ...(settings?.preSendChecklist ?? {}) }
}

/**
 * Whether this person sees the checklist buttons. A custom role is chosen on its own: it does not borrow the role it is based on.
 */
export function canSeeChecklist(settings: Pick<AppSettings, 'preSendChecklist'> | undefined, profile: { role: string; customRoleId: string | null } | null): boolean {
  if (!profile) return false
  const s = checklistSettings(settings)
  if (!s.enabled) return false
  return s.visibleTo.includes(profile.customRoleId ?? profile.role)
}

export function checklistRecipients(settings: Pick<AppSettings, 'preSendChecklist'> | undefined): string[] {
  return checklistSettings(settings).recipients
}

export function checklistSubject(s: Pick<PreSendChecklistSettings, 'subjectTemplate'>, emailName: string): string {
  return s.subjectTemplate.split('{{emailName}}').join(emailName)
}

const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Addresses from a pasted list (commas, semicolons, spaces or lines), each once, and what was not an address. */
export function parseRecipients(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    if (!ADDRESS.test(part)) { invalid.push(part); continue }
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    valid.push(part)
  }
  return { valid, invalid }
}

// ─── The checklist, filled in ───────────────────────────────────────────────────────────────────────

export interface ChecklistLink { label: string; url: string }
export interface ChecklistBlock { title?: string; description: string[]; items: ChecklistLink[] }

export interface ChecklistModel {
  draftName: string
  sendDate: string
  sendingProfile: string
  utmCampaign: string
  subjectLine: string
  previewLine: string
  title: string[]
  greeting: string
  /** The sign-off message and signature, one entry for each paragraph */
  signature: string[]
  atlDisclaimer: string
  btlDisclaimer: string[]
  links: { inline: ChecklistLink[]; blocks: ChecklistBlock[] }
  listName: string
  /** Supplied by Pardot, so left blank */
  totalProspects: string
  mailableProspects: string
  basicTags: string
  completionTags: string
  completionActions: string
}

const tidy = (s: string) => s.split('\n').map((l) => l.replace(/[\s ]+/g, ' ').trim()).filter(Boolean).join('\n')

/** The words of a node: runs of space become one, a line break stays one, and a link reads as what a person pasting it needs. */
function textOf(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ')
  if (node.nodeType !== 1) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (tag === 'br') return '\n'
  if (tag === 'a') {
    // What a reader sees. A link that reads as a web address stays as that, not the tracked address behind it.
    const label = tidy(Array.from(el.childNodes).map(textOf).join(''))
    const href = (el.getAttribute('href') ?? '').trim()
    if (/unsubscribe/i.test(href)) return `${label}: ${href}`
    return label
  }
  return Array.from(el.childNodes).map(textOf).join('')
}

const paragraphText = (el: Element) => tidy(textOf(el))

const SKIP_LABEL = /^(visit website|view online|privacy notice|unsubscribe.*)$/i

function dayMonthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (iso ?? '')
}

/** Whether this reads as a heading: an h1–h4, or short text in the brand's Display font, which is how modules write theirs. */
const isHeading = (el: Element) =>
  /^h[1-4]$/i.test(el.tagName) || (/Visuelt Display/i.test(el.getAttribute('style') ?? '') && ['P', 'TD', 'TH', 'DIV', 'SPAN'].includes(el.tagName))

/**
 * The links in the email, as the checklist lists them: those in running text, then each call to action under the heading
 * that comes before it, with the paragraphs between the two. A link belongs to the nearest heading before it, so one
 * module's link is never taken for the previous module's.
 */
function extractLinks(doc: Document, skip: (a: Element) => boolean): ChecklistModel['links'] {
  const inline: ChecklistLink[] = []
  const blocks: ChecklistBlock[] = []
  const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,p,td,th,div,span'))
    .filter((el) => isHeading(el) && !Array.from(el.querySelectorAll('*')).some(isHeading))
    .filter((el) => { const t = paragraphText(el); return t.length >= 3 && t.length <= 140 })
  const paragraphs = Array.from(doc.querySelectorAll('p'))
  const blockOf = new Map<Element, ChecklistBlock>()
  // Where each element comes in the document. Compared by number, not by compareDocumentPosition, which some DOMs get wrong.
  const place = new Map(Array.from(doc.querySelectorAll('*')).map((el, i) => [el, i] as const))
  const at = (el: Element) => place.get(el) ?? -1

  // The email's modules are the rows of its main table: the table with the most rows of its own.
  const rowsOf = (t: Element) => Array.from(t.children).flatMap((c) => (c.tagName === 'TBODY' ? Array.from(c.children) : [c])).filter((c) => c.tagName === 'TR')
  const mainTable = Array.from(doc.querySelectorAll('table')).reduce<Element | null>((best, t) => (rowsOf(t).length > (best ? rowsOf(best).length : 0) ? t : best), null)
  const rows = mainTable ? rowsOf(mainTable) : []
  const rowIndex = (el: Element) => rows.findIndex((r) => r === el || r.contains(el))
  let previousRow = -1

  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    const url = (a.getAttribute('href') ?? '').trim()
    const label = tidy(Array.from(a.childNodes).map(textOf).join(''))
    if (!url || !label || url.startsWith('#') || /^(mailto|tel):/i.test(url) || /unsubscribe/i.test(url) || /^\{\{[^}]+\}\}$/.test(url)) continue
    if (SKIP_LABEL.test(label) || skip(a) || a.closest('.disclaimer-copy')) continue

    const p = a.closest('p')
    if (p && paragraphText(p).length - label.length > 15) {
      if (!inline.some((l) => l.url === url)) inline.push({ label, url })
      continue
    }

    const precedes = (n: Element) => at(n) < at(a)
    // The nearest heading before the link in its own module. A module that is only a button has none, so its heading is the
    // first one in the modules since the last call to action: the text module just above it.
    const row = rowIndex(a)
    const ownRow = headings.filter((h) => precedes(h) && row !== -1 && rowIndex(h) === row)
    const sinceLast = headings.filter((h) => row !== -1 && rowIndex(h) > previousRow && rowIndex(h) < row)
    const before = headings.filter(precedes)
    const heading = ownRow[ownRow.length - 1] ?? (row !== -1 ? sinceLast[0] : before[before.length - 1])
    if (row !== -1) previousRow = row
    const block = heading ? blockOf.get(heading) : undefined
    if (block) {
      if (!block.items.some((i) => i.url === url)) block.items.push({ label, url })
      continue
    }

    const description = heading
      ? paragraphs
          .filter((n) => at(n) > at(heading) && precedes(n) && !heading.contains(n) && !n.contains(a) && !n.querySelector('a') && paragraphText(n).length > 10)
          .map(paragraphText)
          .slice(0, 6)
      : []
    const created: ChecklistBlock = { ...(heading ? { title: paragraphText(heading) } : {}), description, items: [{ label, url }] }
    blocks.push(created)
    if (heading) blockOf.set(heading, created)
  }
  return { inline, blocks }
}

export interface ChecklistInput {
  brief: BriefPayload
  /** The email as it will be sent */
  emailHtml: string
  settings: Pick<AppSettings, 'greetings' | 'brandThemes'>
  parse: ParseDoc
  now?: Date
}

/** Fills the pre-send checklist from the brief and the email. What Pardot supplies is left blank. */
export function buildChecklist({ brief, emailHtml, settings, parse, now = new Date() }: ChecklistInput): ChecklistModel {
  const doc = parse(emailHtml)
  const { campaign, audience, content, deadlines } = brief

  // The sign-off message and signature: the paragraphs of the cell that holds the sign-off word.
  const signOff = Array.from(doc.querySelectorAll('p')).find((p) => SIGN_OFF_WORDS.test(paragraphText(p).split('\n')[0]))
  const signatureCell = signOff?.closest('td') ?? null
  const signature = signatureCell
    ? Array.from(signatureCell.querySelectorAll('p')).filter((p) => !p.parentElement?.closest('p')).map(paragraphText).filter(Boolean)
    : []

  const disclaimer = Array.from(doc.querySelectorAll('p.disclaimer-copy')).map(paragraphText).filter(Boolean)

  const greetings = settings.greetings ?? []
  const greeting = (greetings.find((g) => g.id === content.greetingId) ?? greetings.find((g) => g.isDefault))?.value ?? ''

  return {
    draftName: `Draft: ${buildEmailName(campaign.campaignName, audience?.region ?? [], audience?.channel ?? [], campaign.emailDescription)}`,
    sendDate: dayMonthYear(deadlines?.sendDate),
    sendingProfile: senderLine(campaign),
    utmCampaign: campaign.utmCampaign ?? '',
    subjectLine: campaign.subjectLine ?? '',
    previewLine: campaign.previewText ?? '',
    title: [content.headline, content.subHeadline].filter((t): t is string => !!t),
    greeting,
    signature,
    atlDisclaimer: '-',
    btlDisclaimer: disclaimer,
    links: extractLinks(doc, (a) => !!signatureCell && signatureCell.contains(a)),
    listName: (audience?.distributionLists ?? []).map((l) => l.name.replace(/\.[^.]+$/, '')).join(', '),
    totalProspects: '',
    mailableProspects: '',
    basicTags: buildTags(brief as unknown as BriefFormData, settings.brandThemes ?? [], now),
    completionTags: '',
    completionActions: '',
  }
}

// ─── The checklist as an HTML document, for the email body and for the file to download ─────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const lines = (s: string) => esc(s).replace(/\n/g, '<br>')

const FONT = 'font-family:Arial,Helvetica,sans-serif;'
const LABEL_STYLE = `${FONT}font-size:12px;font-weight:bold;color:#555555;padding:10px 0 3px 0;`
const VALUE_STYLE = `${FONT}font-size:14px;line-height:20px;color:#222222;padding:6px 10px;border:1px solid #cccccc;background:#fafafa;`
const SECTION_STYLE = `${FONT}font-size:15px;font-weight:bold;color:#134848;padding:22px 0 4px 0;border-bottom:2px solid #134848;`

const field = (label: string, key: string, value: string) =>
  `<tr><td style="${LABEL_STYLE}">${esc(label)}</td></tr><tr><td data-field="${key}" style="${VALUE_STYLE}">${value.trim() ? lines(value) : '&nbsp;'}</td></tr>`
const section = (heading: string) => `<tr><td style="${SECTION_STYLE}">${esc(heading)}</td></tr>`

function linksHtml(links: ChecklistModel['links']): string {
  const rule = '<hr style="border:0;border-top:1px dashed #999999;margin:10px 0;">'
  const parts: string[] = []
  if (links.inline.length > 0) parts.push(links.inline.map((l) => `${esc(l.label)} (${esc(l.url)})`).join('<br>'))
  for (const b of links.blocks) {
    const body = [
      b.title ? `<strong>${esc(b.title)}</strong>` : '',
      ...b.description.map(lines),
      b.items.map((i) => `${esc(i.label)}: ${esc(i.url)}`).join('<br>'),
    ].filter(Boolean)
    parts.push(body.join('<br>'))
  }
  return parts.join(rule)
}

/** The filled-in checklist as a standalone HTML document with inline styles, so it can be opened, copied and pasted into an email. */
export function checklistHtml(m: ChecklistModel): string {
  const linksCell = linksHtml(m.links)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Pre-send checklist — ${esc(m.draftName)}</title></head>
<body style="margin:0;padding:24px;background:#ffffff;">
<table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;">
<tr><td style="${FONT}font-size:20px;font-weight:bold;color:#222222;">EMAIL PRE-SEND APPROVAL CHECKLIST</td></tr>
<tr><td style="${FONT}font-size:13px;color:#555555;padding:4px 0 8px 0;">To be completed and circulated for sign-off before any campaign is scheduled.</td></tr>
${field('Campaign / Draft Name', 'draftName', m.draftName)}
${section('1. CAMPAIGN DETAILS')}
${field('Send Date & Time', 'sendDate', m.sendDate)}
${field('Sending Profile', 'sendingProfile', m.sendingProfile)}
${field('UTM Campaign', 'utmCampaign', m.utmCampaign)}
${section('2. SUBJECT LINE & PREVIEW')}
${field('Subject Line', 'subjectLine', m.subjectLine)}
${field('Preview Line', 'previewLine', m.previewLine)}
${section('3. CONTENT')}
${field('Title', 'title', m.title.join('\n'))}
${field('Greeting Logic', 'greeting', m.greeting)}
${field('Signature', 'signature', m.signature.join('\n\n'))}
${field('ATL Disclaimer', 'atlDisclaimer', m.atlDisclaimer)}
${field('BTL Disclaimer', 'btlDisclaimer', m.btlDisclaimer.join('\n\n'))}
${section('4. LINKS & CTAS')}
<tr><td style="${LABEL_STYLE}">URL</td></tr><tr><td data-field="links" style="${VALUE_STYLE}">${linksCell || '&nbsp;'}</td></tr>
${section('5. AUDIENCE')}
${field('List Name', 'listName', m.listName)}
${field('Total Prospects', 'totalProspects', m.totalProspects)}
${field('Mailable Prospects', 'mailableProspects', m.mailableProspects)}
${section('6. TAGGING')}
${field('Basic Tags', 'basicTags', m.basicTags)}
${field('Completion Tags', 'completionTags', m.completionTags)}
${field('Completion Actions', 'completionActions', m.completionActions)}
</table>
</body>
</html>`
}

/** A file name for the downloaded checklist. */
export function checklistFileName(m: Pick<ChecklistModel, 'draftName'>): string {
  const slug = m.draftName.replace(/^Draft:\s*/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `pre-send-checklist-${slug || 'email'}.html`
}
