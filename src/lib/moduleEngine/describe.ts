import { parseModuleDom, parseRegions, regionElements, type ParseDoc, type RegionField } from './regions'
import { findRepeats, resizeRepeat, type RepeatGroup } from './repeats'
import { listPlaceholders } from './render'

export interface FieldInfo extends RegionField {
  label: string
  locked: boolean
}

export interface ModuleInfo {
  fields: FieldInfo[]
  repeats: RepeatGroup[]
  images: string[]
}

// Modules whose regions are driven by another feature, not free text (spec §8.2).
const LOCKED_MODULES = new Set(['Greeting'])

function baseLabel(tag: string, kind: RegionField['kind']): string {
  if (kind === 'button') return 'Button'
  if (kind === 'image') return 'Image'
  if (kind === 'rich') return 'Text'
  if (tag === 'h1') return 'Headline'
  if (tag === 'h2') return 'Sub-headline'
  if (/^h[3-6]$/.test(tag)) return 'Heading'
  return 'Text'
}

export function describeModule(
  moduleName: string, html: string, parse: ParseDoc, repeats: Record<string, number> = {},
): ModuleInfo {
  const dom = parseModuleDom(html, parse)
  for (const [group, count] of Object.entries(repeats)) resizeRepeat(dom, group, count)
  const { groups, unitOf } = findRepeats(dom)
  const fields = parseRegions(dom, unitOf)
  const els = regionElements(dom)
  const seen = new Map<string, number>()
  const locked = LOCKED_MODULES.has(moduleName)

  const infos = fields.map((f, i) => {
    const base = baseLabel(els[i].tagName.toLowerCase(), f.kind)
    const unit = f.key.match(/^[^[]+\[(\d+)\]/)
    const scope = unit ? `Item ${Number(unit[1]) + 1} — ` : ''
    const bucket = `${scope}${base}`
    seen.set(bucket, (seen.get(bucket) ?? 0) + 1)
    return { f, bucket }
  })
  const totals = new Map<string, number>()
  for (const { bucket } of infos) totals.set(bucket, (totals.get(bucket) ?? 0) + 1)
  const running = new Map<string, number>()
  return {
    fields: infos.map(({ f, bucket }) => {
      const n = (running.get(bucket) ?? 0) + 1
      running.set(bucket, n)
      return { ...f, label: (totals.get(bucket) ?? 1) > 1 ? `${bucket} ${n}` : bucket, locked }
    }),
    repeats: groups,
    images: listPlaceholders(html),
  }
}
