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
export function parseModuleDom(html: string, parse: ParseDoc = browserParse): ModuleDom {
  const startsWithRow = /^\s*(?:<!--[\s\S]*?-->\s*)*<tr[\s>]/i.test(html)
  const wrapped = startsWithRow
    ? `<!DOCTYPE html><html><body><table><tbody id="mod-root">${html}</tbody></table></body></html>`
    : `<!DOCTYPE html><html><body><div id="mod-root">${html}</div></body></html>`
  const doc = parse(wrapped)
  const root = doc.getElementById('mod-root')
  if (!root) throw new Error('Module could not be parsed')
  return { doc, root }
}

export function moduleHtml(dom: ModuleDom): string {
  return dom.root.innerHTML
}

export function regionElements(dom: ModuleDom): Element[] {
  const all = Array.from(dom.root.querySelectorAll('[pardot-region]'))
  // A region that wraps another region is a container (e.g. a detail paragraph
  // around a button link); only the innermost region is the editable field.
  return all.filter((el) => !el.querySelector('[pardot-region]'))
}

function firstTextNode(el: Node): Node | null {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === TEXT && (child.nodeValue ?? '').replace(/[\s ]/g, '') !== '') return child
    if (child.nodeType === ELEMENT) {
      const found = firstTextNode(child)
      if (found) return found
    }
  }
  return null
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

function textOf(el: Element): string {
  const node = firstTextNode(el)
  return (node?.nodeValue ?? '').replace(/^[\s ]+|[\s ]+$/g, '')
}

export function parseRegions(dom: ModuleDom, unitOf?: UnitLookup): RegionField[] {
  const counters = new Map<string, number>()
  return regionElements(dom).map((el) => {
    const rawKind = el.getAttribute('pardot-region') ?? ''
    const kind = kindOf(el, rawKind)
    const unit = unitOf?.(el) ?? null
    const prefix = unit ? `${unit.group}[${unit.index}]` : 'root'
    const ordinal = counters.get(prefix) ?? 0
    counters.set(prefix, ordinal + 1)
    const key = `${prefix}.${ordinal}`

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

function setText(el: Element, value: string): void {
  const node = firstTextNode(el)
  if (!node) return
  const old = node.nodeValue ?? ''
  const lead = old.match(/^[\s ]*/)?.[0] ?? ''
  const trail = old.match(/[\s ]*$/)?.[0] ?? ''
  node.nodeValue = `${lead}${value}${trail}`
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

export function sanitizeRich(html: string, accent: string = DEFAULT_ACCENT): string {
  const stripped = html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>/gi, '')
  return stripped.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g, (_m, slash: string, name: string, attrs: string) => {
    const tag = name.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (tag === 'b' || tag === 'strong') return slash ? '</span>' : boldSpan(accent)
    if (slash) return `</${tag}>`
    const kept: string[] = []
    for (const m of attrs.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const attr = m[1].toLowerCase()
      const val = m[2] ?? m[3] ?? ''
      if (!ALLOWED_ATTRS.has(attr)) continue
      if (attr === 'href' && /^\s*javascript:/i.test(val)) continue
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
