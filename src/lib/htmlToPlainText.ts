import { browserParse, type ParseDoc } from './moduleEngine/regions'

const WIDTH = 76
// Images that are only decoration say nothing in text.
const DECORATIVE = /\b(stripe|stripes|divider|spacer|separator|background)\b/i
const SKIP = new Set(['script', 'style', 'head', 'title', 'noscript', 'svg', 'meta', 'link'])
const PARAGRAPH = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'table', 'pre'])
const LINE = new Set(['div', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'section', 'article', 'header', 'footer', 'center', 'address', 'form', 'li'])

// The hidden preview line and other text a person never sees in the inbox.
function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true
  const style = (el.getAttribute('style') ?? '').toLowerCase().replace(/\s+/g, '')
  return style.includes('display:none') || style.includes('mso-hide:all') || (/max-height:0(px)?;/.test(style) && style.includes('overflow:hidden'))
}

const squash = (s: string) => s.replace(/[ \s]+/g, ' ').trim()

/** The text a person reads in an element, on one line: its words and the alt text of its images. */
function inlineText(node: Node): string {
  if (node.nodeType === 3) return node.nodeValue ?? ''
  if (node.nodeType !== 1) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (SKIP.has(tag) || isHidden(el)) return ''
  if (tag === 'img') return squash(el.getAttribute('alt') ?? '')
  if (tag === 'br') return ' '
  return Array.from(el.childNodes).map(inlineText).join('')
}

function link(label: string, href: string): string {
  const url = href.trim()
  if (!url || url.startsWith('#') || /^javascript:/i.test(url)) return label
  const target = url.replace(/^mailto:/i, '').replace(/^tel:/i, '')
  if (!label) return target
  return label === url || label === target ? target : `${label} (${target})`
}

function wrap(line: string): string[] {
  if (line.length <= WIDTH) return [line]
  const hang = /^(?:- |\d+\. )/.exec(line)?.[0].length ?? 0
  const out: string[] = []
  let cur = ''
  // A merge tag such as {{#if Recipient.FirstName}} holds spaces but is never broken across lines.
  for (const word of line.match(/(?:\{\{.*?\}\}|\S)+/g) ?? []) {
    const next = cur ? `${cur} ${word}` : word
    // A word longer than the line, such as a URL, is left whole rather than cut.
    if (next.length > WIDTH && cur) { out.push(cur); cur = ' '.repeat(hang) + word } else cur = next
  }
  if (cur) out.push(cur)
  return out
}

/**
 * The text of an email as a plain-text part: paragraphs and headings separated by blank lines, links as
 * "text (address)", lists as "- item", images as their alt text, and lines wrapped for a text-only reader.
 * Merge tags such as {{Recipient.FirstName}} are kept, so the text part personalises like the HTML.
 */
export function htmlToPlainText(html: string, parse: ParseDoc = browserParse): string {
  const doc = parse(html)
  const lines: string[] = []
  let cur = ''

  const flush = () => {
    const text = squash(cur)
    cur = ''
    if (text) lines.push(...wrap(text))
  }
  const blank = () => {
    flush()
    if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
  }

  const walk = (node: Node): void => {
    if (node.nodeType === 3) { cur += node.nodeValue ?? ''; return }
    if (node.nodeType !== 1) return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (SKIP.has(tag) || isHidden(el)) return
    if (tag === 'br') { flush(); return }
    if (tag === 'hr') { blank(); lines.push('-'.repeat(40)); blank(); return }
    if (tag === 'img') { const alt = squash(el.getAttribute('alt') ?? ''); if (alt && !DECORATIVE.test(alt)) cur += ` [${alt}] `; return }
    // No padding around a link: the words either side of it already carry their own spaces.
    if (tag === 'a') { cur += link(squash(inlineText(el)), el.getAttribute('href') ?? ''); return }
    if (tag === 'ul' || tag === 'ol') {
      blank()
      let n = 0
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === 1 && (child as Element).tagName.toLowerCase() === 'li') {
          flush()
          cur = tag === 'ol' ? `${++n}. ` : '- '
          Array.from(child.childNodes).forEach(walk)
          flush()
        } else walk(child)
      }
      blank()
      return
    }
    const paragraph = PARAGRAPH.has(tag)
    if (paragraph) blank(); else if (LINE.has(tag)) flush()
    Array.from(el.childNodes).forEach(walk)
    if (tag === 'h1') { flush(); const last = lines.length - 1; if (last >= 0 && lines[last]) lines[last] = lines[last].toUpperCase() }
    if (paragraph) blank(); else if (LINE.has(tag)) flush()
  }

  walk(doc.body ?? doc.documentElement ?? (doc as unknown as Node))
  flush()
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}
