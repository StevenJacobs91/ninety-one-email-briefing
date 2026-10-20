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

export function applyRegions(dom: ModuleDom, values: Record<string, RegionValue>, unitOf?: UnitLookup): void {
  const fields = parseRegions(dom, unitOf)
  const els = regionElements(dom)
  fields.forEach((field, i) => {
    const patch = values[field.key]
    if (!patch) return
    const el = els[i]
    if (patch.removed) {
      el.parentNode?.removeChild(el)
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
      if (patch.value !== undefined) el.innerHTML = sanitizeRich(patch.value)
      return
    }
    const target = anchorOf(el) ?? el
    if (patch.value !== undefined) setText(target, patch.value)
    if (patch.href !== undefined && anchorOf(el)) anchorOf(el)!.setAttribute('href', patch.href)
  })
}

const ALLOWED_TAGS = new Set(['a', 'b', 'strong', 'i', 'em', 'u', 'br', 'span', 'sup', 'sub'])
const ALLOWED_ATTRS = new Set(['href', 'style', 'target', 'title', 'class'])

export function sanitizeRich(html: string): string {
  const stripped = html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>/gi, '')
  return stripped.replace(/<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g, (_m, slash: string, name: string, attrs: string) => {
    const tag = name.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (slash) return `</${tag}>`
    const kept: string[] = []
    for (const m of attrs.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const attr = m[1].toLowerCase()
      const val = m[2] ?? m[3] ?? ''
      if (!ALLOWED_ATTRS.has(attr)) continue
      if (attr === 'href' && /^\s*javascript:/i.test(val)) continue
      kept.push(`${attr}="${val}"`)
    }
    return `<${tag}${kept.length ? ' ' + kept.join(' ') : ''}>`
  })
}
