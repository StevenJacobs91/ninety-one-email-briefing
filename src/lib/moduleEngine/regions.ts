import { parseStyle, serializeStyle, setStyleProp } from './inlineStyle'

export type RegionKind = 'text' | 'rich' | 'button' | 'image'

export interface RegionField {
  key: string
  rawKind: string
  kind: RegionKind
  value: string
  href?: string
  alt?: string
}

export interface RegionValue {
  value?: string
  href?: string
  alt?: string
  /** Take this region's element out of the module (e.g. the unused alternative greeting). */
  removed?: boolean
}

export type ParseDoc = (html: string) => Document

export interface ModuleDom {
  doc: Document
  root: Element
}

/** Maps a region element to its repeating unit, supplied by repeats.ts. */
export type UnitLookup = (el: Element) => { group: string; index: number } | null

const ELEMENT = 1
const TEXT = 3

export function browserParse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

// Library modules are bare <tr> rows, which an HTML parser drops outside a
// table, so they are parsed inside one. Non-row modules (the preheader div)
// are parsed inside a div.
export function parseModuleDom(html: string, parse: ParseDoc = browserParse, opts: { auto?: boolean } = {}): ModuleDom {
  const startsWithRow = /^\s*(?:<!--[\s\S]*?-->\s*)*<tr[\s>]/i.test(html)
  const wrapped = startsWithRow
    ? `<!DOCTYPE html><html><body><table><tbody id="mod-root">${html}</tbody></table></body></html>`
    : `<!DOCTYPE html><html><body><div id="mod-root">${html}</div></body></html>`
  const doc = parse(wrapped)
  const root = doc.getElementById('mod-root')
  if (!root) throw new Error('Module could not be parsed')
  if (opts.auto) tagAutoRegions(root)
  return { doc, root }
}

export function moduleHtml(dom: ModuleDom): string {
  // The editing markers are only for the editor; they never reach the email.
  for (const el of Array.from(dom.root.querySelectorAll(`[${AUTO_ATTR}]`))) el.removeAttribute(AUTO_ATTR)
  return dom.root.innerHTML
}

export function regionElements(dom: ModuleDom): Element[] {
  const all = Array.from(dom.root.querySelectorAll('[pardot-region]'))
  // A region that wraps another region is a container (e.g. a detail paragraph
  // around a button link); only the innermost region is the editable field.
  const marked = all.filter((el) => !el.querySelector('[pardot-region]'))
  // Text the design left unmarked follows, so the keys of the marked regions never move.
  return [...marked, ...Array.from(dom.root.querySelectorAll(`[${AUTO_ATTR}]`))]
}

// ─── Text the design did not mark as editable ────────────────

/** Set on text the library design left unmarked so it can be edited too. Removed again before output. */
export const AUTO_ATTR = 'data-auto-region'

// Slots driven by the form or by Settings, and legal wording, stay as designed.
const FIXED_MODULE = /^(Visually Hidden|Small Header|Header with Image|Plain Logo Header|Disclaimer|Risk Warning|Greeting)/i
export function isAutoEditable(moduleName: string): boolean {
  return !FIXED_MODULE.test(moduleName)
}

const TEXT_BLOCK = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'])
const TEXT_CELL = new Set(['TD', 'TH', 'DIV', 'SPAN'])
const BLOCKS = 'p,h1,h2,h3,h4,h5,h6,li,ul,ol,blockquote,table,div,td,th,img'
const NOT_CONTENT = 'style,script,head,title,noscript'
const HIDDEN = '[style*="display:none"],[style*="display: none"],[style*="mso-hide:all"],[style*="mso-hide: all"]'

const hasWords = (text: string) => /[\p{L}\p{N}]/u.test(text)

function tagAutoRegions(root: Element): void {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const tag = el.tagName
    if (el.closest(NOT_CONTENT) || el.closest('[pardot-region]') || el.querySelector('[pardot-region]')) continue
    if (el.closest(HIDDEN) || el.parentElement?.closest(`[${AUTO_ATTR}]`)) continue
    if (!hasWords(el.textContent ?? '')) continue

    if (TEXT_BLOCK.has(tag)) {
      if (!el.querySelector(BLOCKS)) el.setAttribute(AUTO_ATTR, 'paragraph')
    } else if (TEXT_CELL.has(tag)) {
      const ownText = Array.from(el.childNodes).some((n) => n.nodeType === TEXT && hasWords(n.nodeValue ?? ''))
      if (ownText && !el.querySelector(BLOCKS)) el.setAttribute(AUTO_ATTR, 'paragraph')
    } else if (tag === 'A' && el.hasAttribute('href')) {
      // Only the link's own words are edited, so an icon beside them stays.
      if (!Array.from(el.childNodes).some((n) => n.nodeType === TEXT && hasWords(n.nodeValue ?? ''))) continue
      el.setAttribute(AUTO_ATTR, 'text')
    }
  }
}

function anchorOf(el: Element): Element | null {
  return el.tagName === 'A' ? el : el.querySelector('a')
}

function imageOf(el: Element): Element | null {
  return el.tagName === 'IMG' ? el : el.querySelector('img')
}

function kindOf(el: Element, rawKind: string): RegionKind {
  if (rawKind === 'editable-image' || el.tagName === 'IMG') return 'image'
  if (rawKind === 'button') return 'button'
  if (rawKind === 'paragraph') return 'rich'
  return 'text'
}

/** The words of an element, one line per <br>, with the whitespace tidied and empty lines dropped. */
function textOf(el: Element): string {
  const lines = ['']
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === TEXT) lines[lines.length - 1] += child.nodeValue ?? ''
      else if (child.nodeType === ELEMENT) {
        const tag = (child as Element).tagName
        if (tag === 'BR') lines.push('')
        else if (tag !== 'IMG') walk(child)
      }
    }
  }
  walk(el)
  return lines.map((l) => l.replace(/[\s\u00a0]+/g, ' ').trim()).filter(Boolean).join('\n')
}

export function parseRegions(dom: ModuleDom, unitOf?: UnitLookup): RegionField[] {
  const counters = new Map<string, number>()
  return regionElements(dom).map((el) => {
    const auto = el.hasAttribute(AUTO_ATTR)
    const rawKind = auto ? (el.getAttribute(AUTO_ATTR) ?? '') : (el.getAttribute('pardot-region') ?? '')
    const kind = kindOf(el, rawKind)
    const unit = unitOf?.(el) ?? null
    const prefix = unit ? `${unit.group}[${unit.index}]` : 'root'
    const counter = auto ? `${prefix}#auto` : prefix
    const ordinal = counters.get(counter) ?? 0
    counters.set(counter, ordinal + 1)
    const key = auto ? `${prefix}.a${ordinal}` : `${prefix}.${ordinal}`

    if (kind === 'image') {
      const img = imageOf(el)
      return { key, rawKind, kind, value: img?.getAttribute('src') ?? '', alt: img?.getAttribute('alt') ?? '' }
    }
    if (kind === 'rich') return { key, rawKind, kind, value: el.innerHTML }
    const a = anchorOf(el)
    const field: RegionField = { key, rawKind, kind, value: textOf(a ?? el) }
    if (a) field.href = a.getAttribute('href') ?? ''
    return field
  })
}

function wordNodes(el: Node): Node[] {
  const found: Node[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === TEXT && (child.nodeValue ?? '').replace(/[\s\u00a0]/g, '') !== '') found.push(child)
    else if (child.nodeType === ELEMENT && (child as Element).tagName !== 'IMG') found.push(...wordNodes(child))
  }
  return found
}

/**
 * Replaces all of an element's words with `value`, one line per newline. The old line breaks go and the first one's
 * markup (such as a class that hides it on a phone) is reused between the new lines. Icons and links stay.
 */
function setText(el: Element, value: string): void {
  const words = wordNodes(el)
  if (words.length === 0) return
  const first = words[0]
  const lead = (first.nodeValue ?? '').match(/^[\s\u00a0]*/)?.[0] ?? ''
  const trail = (words[words.length - 1].nodeValue ?? '').match(/[\s\u00a0]*$/)?.[0] ?? ''
  const breaks = Array.from(el.querySelectorAll('br'))
  const doc = el.ownerDocument
  const lines = value.split(/\r?\n/)

  lines.forEach((line, i) => {
    if (i > 0) first.parentNode?.insertBefore(breaks[0] ? breaks[0].cloneNode(false) : doc.createElement('br'), first)
    first.parentNode?.insertBefore(doc.createTextNode(`${i === 0 ? lead : ''}${line}${i === lines.length - 1 ? trail : ''}`), first)
  })

  const emptied = new Set<Element>()
  for (const node of words) {
    for (let p = node.parentElement; p && p !== el; p = p.parentElement) emptied.add(p)
    node.parentNode?.removeChild(node)
  }
  // The old breaks go; so do the formatting elements that held only the old words.
  for (const br of breaks) br.parentNode?.removeChild(br)
  for (const holder of [...emptied].reverse()) {
    if (holder.childNodes.length === 0 || (holder.textContent ?? '').trim() === '' && !holder.querySelector('img, br')) holder.parentNode?.removeChild(holder)
  }
}

/** Applies the saved values and returns, for each region key, the elements it now occupies (a split paragraph region has several). */
export function applyRegions(
  dom: ModuleDom, values: Record<string, RegionValue>, unitOf?: UnitLookup, opts: { accent?: string } = {},
): Map<string, Element[]> {
  const fields = parseRegions(dom, unitOf)
  const els = regionElements(dom)
  const occupied = new Map<string, Element[]>()
  fields.forEach((field, i) => {
    const el = els[i]
    occupied.set(field.key, [el])
    const patch = values[field.key]
    if (!patch) return
    if (patch.removed) {
      el.parentNode?.removeChild(el)
      occupied.set(field.key, [])
      return
    }
    if (field.kind === 'image') {
      const img = imageOf(el)
      if (!img) return
      if (patch.value !== undefined) img.setAttribute('src', patch.value)
      if (patch.alt !== undefined) img.setAttribute('alt', patch.alt)
      return
    }
    if (field.kind === 'rich') {
      if (patch.value !== undefined) occupied.set(field.key, setRichParagraphs(el, patch.value, opts.accent))
      return
    }
    const target = anchorOf(el) ?? el
    if (patch.value !== undefined) setText(target, patch.value)
    if (patch.href !== undefined && anchorOf(el)) anchorOf(el)!.setAttribute('href', patch.href)
  })
  return occupied
}

const ALLOWED_TAGS = new Set(['a', 'b', 'strong', 'i', 'em', 'u', 'br', 'span', 'sup', 'sub'])
const ALLOWED_ATTRS = new Set(['href', 'style', 'target', 'title', 'class'])

/** Cape Coral, used when no theme accent is known. */
export const DEFAULT_ACCENT = '#fbaa96'

/** Brand bold: Visuelt Medium in the theme's accent colour, never a browser bold. */
function boldSpan(accent: string): string {
  return `<span style="font-family: Ninety One Visuelt Medium, arial, helvetica, sans-serif; font-weight: normal; color: ${accent};">`
}

const LEGAL_STYLE = new Set(['font-size', 'font-weight', 'font-style', 'text-decoration'])
const LEGAL_SIZE = { min: 8, max: 24 }

/**
 * Cleans pasted or edited rich text. `legal` is for disclaimers: bold stays plain bold rather than the
 * brand's accent colour, text size is kept (within a readable range), and only text styling survives.
 */
export function sanitizeRich(html: string, accent: string = DEFAULT_ACCENT, opts: { legal?: boolean } = {}): string {
  const stripped = html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>/gi, '')
  return stripped.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g, (_m, slash: string, name: string, attrs: string) => {
    const tag = name.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (tag === 'b' || tag === 'strong') return opts.legal ? (slash ? '</strong>' : '<strong>') : (slash ? '</span>' : boldSpan(accent))
    if (slash) return `</${tag}>`
    const kept: string[] = []
    for (const m of attrs.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const attr = m[1].toLowerCase()
      const val = m[2] ?? m[3] ?? ''
      if (!ALLOWED_ATTRS.has(attr) || (opts.legal && attr === 'class')) continue
      if (attr === 'href' && /^\s*javascript:/i.test(val)) continue
      if (attr === 'style' && opts.legal) {
        const kept2 = parseStyle(val).filter(([prop, value]) => {
          if (!LEGAL_STYLE.has(prop)) return false
          if (prop !== 'font-size') return !/url\s*\(|expression\s*\(|javascript:/i.test(value)
          const px = value.trim().match(/^(\d+(?:\.\d+)?)px$/i)
          return !!px && Number(px[1]) >= LEGAL_SIZE.min && Number(px[1]) <= LEGAL_SIZE.max
        })
        if (kept2.length > 0) kept.push(`style="${serializeStyle(kept2)}"`)
        continue
      }
      if (attr === 'style') {
        // Text size comes from the module, not from pasted content, and a style cannot fetch or run anything.
        const decls = parseStyle(val)
        const withoutSize = decls.filter(([prop, value]) => prop !== 'font-size' && !/url\s*\(|expression\s*\(|javascript:/i.test(value))
        if (withoutSize.length === 0) continue
        kept.push(`style="${withoutSize.length === decls.length ? val : serializeStyle(withoutSize)}"`)
        continue
      }
      kept.push(`${attr}="${val}"`)
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}>`
  })
}

const VOID_TAGS = new Set(['br', 'img', 'hr'])

/**
 * Splits editor HTML into paragraphs: every line break (a <br>, a new line, or the start of a new editor
 * block) begins a new paragraph and blank lines are dropped. Formatting that spans a break is closed
 * and reopened, so each paragraph keeps it.
 */
export function richToParagraphs(html: string): string[] {
  const paras: string[] = []
  let current = ''
  const stack: { name: string; raw: string }[] = []

  const finish = () => {
    const text = current.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00a0/g, ' ').trim()
    if (text !== '') paras.push(current + [...stack].reverse().map((t) => `</${t.name}>`).join(''))
    current = stack.map((t) => t.raw).join('')
  }

  for (const token of html.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (token[0] !== '<') {
      token.split(/\r?\n/).forEach((part, i) => {
        if (i > 0) finish()
        current += part
      })
      continue
    }
    const m = token.match(/^<(\/?)([a-zA-Z][\w:-]*)/)
    if (!m) {
      current += token
      continue
    }
    const closing = m[1] === '/'
    const name = m[2].toLowerCase()
    if (name === 'br' || name === 'div' || name === 'p') {
      finish()
      continue
    }
    if (VOID_TAGS.has(name) || /\/\s*>$/.test(token)) {
      current += token
      continue
    }
    if (closing) {
      const at = stack.map((t) => t.name).lastIndexOf(name)
      if (at >= 0) stack.splice(at)
      current += token
      continue
    }
    stack.push({ name, raw: token })
    current += token
  }
  finish()
  return paras.length > 0 ? paras : ['']
}

/** The size the module sets for this element's text: its own, else the nearest ancestor's, else 16px. */
export const DEFAULT_FONT_SIZE = '16px'

export function effectiveFontSize(el: Element): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const size = parseStyle(node.getAttribute('style')).find(([prop]) => prop === 'font-size')?.[1]
    if (size) return size
  }
  return DEFAULT_FONT_SIZE
}

/** The space left under each paragraph except the last when a region is split into several. */
export const PARAGRAPH_GAP_PX = 16

function setRichParagraphs(el: Element, html: string, accent?: string): Element[] {
  const paras = richToParagraphs(html).map((p) => sanitizeRich(p, accent))
  const tag = el.tagName.toLowerCase()
  const size = effectiveFontSize(el)
  // Only a <p> or <div> can be repeated as a sibling; anything else keeps its paragraphs as line breaks.
  if (paras.length === 1 || (tag !== 'p' && tag !== 'div')) {
    el.innerHTML = paras.join('<br>')
    if (tag === 'p' || tag === 'div') setStyleProp(el, 'font-size', size)
    return [el]
  }
  el.innerHTML = paras[0]
  const made: Element[] = [el]
  let after: Element = el
  for (const para of paras.slice(1)) {
    const copy = el.cloneNode(false) as Element
    copy.removeAttribute('pardot-region')
    copy.removeAttribute(AUTO_ATTR)
    copy.innerHTML = para
    after.parentNode?.insertBefore(copy, after.nextSibling)
    made.push(copy)
    after = copy
  }
  // Every paragraph states the module's text size, whatever the email client inherits.
  for (const p of made) setStyleProp(p, 'font-size', size)
  // Space the paragraphs apart; the last keeps the region's own spacing.
  let p: Element | null = el
  for (let i = 0; i < paras.length - 1 && p; i++) {
    setStyleProp(p, 'margin-bottom', `${PARAGRAPH_GAP_PX}px`)
    p = p.nextElementSibling
  }
  return made
}
