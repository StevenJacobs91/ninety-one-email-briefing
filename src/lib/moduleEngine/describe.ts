import { footerSections, isFooterModule } from './footer'
import { buttonRows } from './buttonWidths'
import { AUTO_ATTR, isAutoEditable, parseModuleDom, parseRegions, regionElements, type ParseDoc, type RegionField } from './regions'
import { findRepeats, resizeRepeat, type RepeatGroup } from './repeats'
import { listImageSlots } from './render'
import { allowsMargin, moduleContainer, readBox, type BoxRead } from './boxModel'

export interface FieldInfo extends RegionField {
  label: string
  locked: boolean
  /** For a footer: the part of it this field is in */
  section?: 'signoff' | 'signature' | 'tail'
  /** What the field is, without which item it is in or its number: "Heading", "Category title", "Media" */
  name?: string
  /** The repeating unit (an article, say) the field is in, and which one */
  unit?: { group: string; index: number }
}

export interface BoxInfo {
  /** 'container' (the module's outer cell) or a region key */
  key: string
  label: string
  allowMargin: boolean
  /** The values the library design has now */
  read: BoxRead
}

export interface ModuleInfo {
  fields: FieldInfo[]
  boxes: BoxInfo[]
  repeats: RepeatGroup[]
  images: string[]
  /** For a footer: which of its parts the module has */
  footer?: { hasSignoff: boolean; hasSignature: boolean; hasSocial: boolean }
  /** How many buttons are in each row of buttons, top to bottom; empty for a module with none. Always set by describeModule. */
  buttonRows?: number[]
  /** What each entry of `images` is: a placeholder image, or a person's photo from the profile library */
  imageKinds: ('placeholder' | 'profile' | 'graphic')[]
  /** Whether each entry of `images` sits inside a repeating unit, and so is edited with that unit rather than as a shared image */
  imageInUnit?: boolean[]
}

// Modules whose regions are driven by another feature, not free text (spec §8.2).
const LOCKED_MODULES = new Set(['Greeting'])

function baseLabel(tag: string, kind: RegionField['kind'], rawKind: string, inUnit: boolean): string {
  if (rawKind === 'category') return 'Category title'
  if (rawKind === 'blurb') return 'Blurb'
  if (kind === 'image' && inUnit) return 'Media'
  if (tag === 'a' && inUnit && kind === 'text') return 'Link title'
  if (kind === 'button') return 'Button'
  if (kind === 'image') return 'Image'
  if (tag === 'a') return 'Link'
  if (kind === 'rich' && !/^h[1-6]$/.test(tag)) return 'Text'
  if (tag === 'h1') return 'Headline'
  if (tag === 'h2') return 'Sub-headline'
  if (/^h[3-6]$/.test(tag)) return 'Heading'
  return 'Text'
}

export function describeModule(
  moduleName: string, html: string, parse: ParseDoc, repeats: Record<string, number> = {},
): ModuleInfo {
  const dom = parseModuleDom(html, parse, { auto: isAutoEditable(moduleName) })
  for (const [group, count] of Object.entries(repeats)) resizeRepeat(dom, group, count)
  const { groups, unitOf } = findRepeats(dom)
  // Fields are listed as they read in the email, however they were found.
  const found = parseRegions(dom, unitOf)
  const foundEls = regionElements(dom)
  const position = new Map(Array.from(dom.root.querySelectorAll('*')).map((e, i) => [e, i]))
  const order = found.map((_, i) => i).sort((a, b) => (position.get(foundEls[a]) ?? 0) - (position.get(foundEls[b]) ?? 0))
  const fields = order.map((i) => found[i])
  const els = order.map((i) => foundEls[i])
  const seen = new Map<string, number>()
  const locked = LOCKED_MODULES.has(moduleName)

  const infos = fields.map((f, i) => {
    const base = baseLabel(els[i].tagName.toLowerCase(), f.kind, f.rawKind, unitOf(els[i]) !== null)
    const unit = f.key.match(/^[^[]+\[(\d+)\]/)
    const scope = unit ? `Item ${Number(unit[1]) + 1} — ` : ''
    const bucket = `${scope}${base}`
    seen.set(bucket, (seen.get(bucket) ?? 0) + 1)
    return { f, bucket, base }
  })
  const totals = new Map<string, number>()
  for (const { bucket } of infos) totals.set(bucket, (totals.get(bucket) ?? 0) + 1)
  const running = new Map<string, number>()
  const fieldInfos: FieldInfo[] = infos.map(({ f, bucket, base }, i) => {
    const n = (running.get(bucket) ?? 0) + 1
    running.set(bucket, n)
    const unit = unitOf(els[i])
    return { ...f, label: (totals.get(bucket) ?? 1) > 1 ? `${bucket} ${n}` : bucket, name: base, ...(unit ? { unit } : {}), locked }
  })

  // A footer is a sign-off, a signature and a tail; say which each field is in.
  const footer = isFooterModule(moduleName) ? footerSections(dom.root) : null
  if (footer) {
    fieldInfos.forEach((f, i) => {
      const el = els[i]
      if (footer.signoff.some((p) => p.contains(el))) f.section = 'signoff'
      else if (footer.signature.some((p) => p.contains(el))) f.section = 'signature'
      else if (footer.tail?.contains(el)) f.section = 'tail'
    })
  }

  // Elements whose spacing and class can be overridden: the module's outer cell, then each editable
  // text or button region (images are left alone, and so are regions driven by another setting).
  const boxes: BoxInfo[] = []
  const container = moduleContainer(dom)
  if (container) boxes.push({ key: 'container', label: 'Module container', allowMargin: false, read: readBox(container) })
  fieldInfos.forEach((f, i) => {
    if (f.locked || f.kind === 'image') return
    boxes.push({ key: f.key, label: f.label, allowMargin: allowsMargin(els[i]), read: readBox(els[i]) })
  })

  const slots = listImageSlots(html)
  const pictures = Array.from(dom.root.querySelectorAll('img'))
  const imageInUnit = slots.map((s) => {
    const same = pictures.filter((img) => img.getAttribute('src') === s.url)
    return same.length > 0 && same.every((img) => img.hasAttribute(AUTO_ATTR))
  })
  return { fields: fieldInfos, boxes, repeats: groups, images: slots.map((x) => x.url), imageKinds: slots.map((x) => x.kind), imageInUnit,
    buttonRows: buttonRows(dom.root).map((r) => r.buttons.length),
    ...(footer ? { footer: { hasSignoff: footer.signoff.length > 0, hasSignature: footer.signature.length > 0, hasSocial: footer.social !== null } } : {}) }
}
