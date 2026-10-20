export const DRAFT_RECIPIENT = 'steven.jacobs@ninetyone.com'

export interface DraftAttachment {
  name: string
  type: string
  /** File content, base64-encoded */
  base64: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function textToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

export async function fileToBase64(file: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()))
}

function wrap76(base64: string): string {
  return (base64.match(/.{1,76}/g) ?? []).join('\r\n')
}

function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7f]*$/.test(value) ? value : `=?UTF-8?B?${textToBase64(value)}?=`
}

function safeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, '_')
}

/**
 * An unsent draft message (.eml). `X-Unsent: 1` makes Outlook open it as a
 * draft ready to send, with the attachments already on it.
 */
export function buildEml(opts: { to: string; subject: string; body: string; attachments: DraftAttachment[] }): string {
  const boundary = `----=_NinetyOne_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  const lines: string[] = [
    'X-Unsent: 1',
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(textToBase64(opts.body)),
  ]
  for (const a of opts.attachments) {
    const name = safeFilename(a.name)
    lines.push(
      `--${boundary}`,
      `Content-Type: ${a.type}; name="${name}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${name}"`,
      '',
      wrap76(a.base64),
    )
  }
  lines.push(`--${boundary}--`, '')
  return lines.join('\r\n')
}

export function slug(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'email'
}

export function submissionFiles(campaignName: string, isoDate: string): { email: string; summary: string } {
  const s = slug(campaignName)
  return { email: `email-${s}-${isoDate}.html`, summary: `brief-summary-${s}-${isoDate}.html` }
}

export function boardLinks(origin: string, briefId: string): { html: string; summary: string } {
  const id = encodeURIComponent(briefId)
  return { html: `${origin}/?brief=${id}&view=html`, summary: `${origin}/?brief=${id}&view=summary` }
}

export function boardNotes(opts: {
  createdByName: string
  createdByEmail: string
  links: { html: string; summary: string }
  at: Date
}): string {
  const who = opts.createdByEmail ? `${opts.createdByName} (${opts.createdByEmail})` : opts.createdByName
  return [
    `Created by: ${who}`,
    `Submitted: ${opts.at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    `Email HTML: ${opts.links.html}`,
    `Brief Summary: ${opts.links.summary}`,
  ].join('\n')
}
