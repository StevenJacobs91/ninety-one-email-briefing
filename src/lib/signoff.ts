import type { SignoffEntry } from '../types/settings.types'
import { DEFAULT_ACCENT, sanitizeRich } from './moduleEngine/regions'

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const linkStyle = (colour: string) => `color: ${colour}; text-decoration: underline;`

/**
 * Plain signature text to email HTML. Line breaks are kept; **bold** and [label](https://…) are
 * understood, and bare web or email addresses become links. Anything else that looks like markup is shown as typed.
 */
export function textToHtml(text: string, linkColour = 'inherit'): string {
  const anchor = (href: string, label: string) => `<a href="${href}" style="${linkStyle(linkColour)}">${label}</a>`
  const links: string[] = []
  const hold = (html: string) => `\u0000${links.push(html) - 1}\u0000`

  let out = text.replace(/\r\n?/g, '\n').replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, (_m, label: string, url: string) =>
    hold(anchor(escapeHtml(url), escapeHtml(label))))
  out = escapeHtml(out).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out
    .replace(/\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/g, (m: string) => {
      const url = m.replace(/[.,;:!?)]+$/, '')
      const tail = m.slice(url.length)
      return hold(anchor(/^www\./.test(url) ? `https://${url}` : url, url)) + tail
    })
    .replace(/\b([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, (m: string) => hold(anchor(`mailto:${m}`, m)))
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => links[Number(i)]).replace(/\n/g, '<br>')
}

export interface SignoffColumns {
  columns: 1 | 2
  format: 'text' | 'code'
  left: string
  right: string
}

/** A signature's layout, with the defaults for ones saved before columns existed. */
export function signoffColumns(s: SignoffEntry): SignoffColumns {
  const columns = s.columns === 2 ? 2 : 1
  return { columns, format: s.format === 'code' ? 'code' : 'text', left: s.text, right: columns === 2 ? (s.textRight ?? '') : '' }
}

const TEXT = 'font-family: Ninety One Visuelt Light, arial, helvetica, sans-serif; font-size: 16px; mso-line-height-rule: exactly; line-height: 22px; text-align: left;'

function columnHtml(source: string, format: 'text' | 'code', accent: string, linkColour?: string): string {
  return format === 'code' ? sanitizeRich(source, accent, { blocks: true }) : sanitizeRich(textToHtml(source, linkColour), accent)
}

/** The signature as email HTML: a block of text, or two cells side by side that stack on a phone. */
export function signoffHtml(s: SignoffEntry, opts: { accent?: string; textStyle?: string; linkColour?: string } = {}): string {
  const { columns, format, left, right } = signoffColumns(s)
  const accent = opts.accent ?? DEFAULT_ACCENT
  const text = opts.textStyle ?? TEXT
  // Code can hold its own <p>s, which cannot sit inside a <p>, so it gets a <div> to carry the text style.
  if (columns === 1) {
    const tag = format === 'code' ? 'div' : 'p'
    return `<${tag} style="margin: 0; ${text}">${columnHtml(left, format, accent, opts.linkColour)}</${tag}>`
  }
  const cell = (source: string) =>
    `<td class="stack-column" valign="top" width="50%" style="${text} padding: 0 10px 0 0; vertical-align: top;">${columnHtml(source, format, accent, opts.linkColour)}</td>`
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>${cell(left)}${cell(right)}</tr></table>`
}

const plain = (html: string) =>
  html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

/** The signature's words on one line, for the list. */
export function signoffSummary(s: SignoffEntry): string {
  const { format, left, right } = signoffColumns(s)
  const words = (source: string) => plain(format === 'code' ? source : textToHtml(source))
  return [words(left), words(right)].filter(Boolean).join(' | ')
}
