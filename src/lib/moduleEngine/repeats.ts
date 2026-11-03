import type { ModuleDom, UnitLookup } from './regions'

export interface RepeatGroup {
  group: string
  units: number
  canResize: boolean
}

interface GroupUnits {
  group: string
  units: Element[]
  resolved: boolean
  /** The design marked the repeating elements themselves, so one is enough to repeat and they need not match */
  explicit: boolean
}

// Two elements are the same kind of unit when their markup is identical once
// text, links, image sources and inline styles are blanked.
function signature(el: Element): string {
  return el.outerHTML
    .replace(/>[^<]*</g, '><')
    .replace(/\s(href|src|alt|title|background|style|data-auto-region)="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
}

function elementChildren(el: Element): Element[] {
  return Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1)
}

// The marker sits inside the repeating unit, not on it. Climb from the marker
// to the nearest ancestor that has a same-signature sibling.
function unitFor(marker: Element, root: Element): Element | null {
  let el: Element | null = marker
  while (el && el !== root) {
    const parent: Element | null = el.parentElement
    if (!parent) return null
    const sig = signature(el)
    const same = elementChildren(parent).filter((c) => c.tagName === el!.tagName && signature(c) === sig)
    if (same.length >= 2) return el
    el = parent
  }
  return null
}

/**
 * The elements the design itself marks as the repeating unit: a marker on the element (not inside it) that sits
 * beside others with the same marker, or on a whole row of the module. These need not look alike: a row for each
 * article is an article, whatever its image size. Keyed by group name.
 */
export function explicitUnits(root: Element): Map<string, Element[]> {
  const found = new Map<string, Element[]>()
  for (const marker of Array.from(root.querySelectorAll('[pardot-repeatable]'))) {
    const parent = marker.parentElement
    if (!parent) continue
    const value = marker.getAttribute('pardot-repeatable')
    const peers = elementChildren(parent).filter((c) => c.tagName === marker.tagName && c.getAttribute('pardot-repeatable') === value)
    if (peers.length < 2 && parent !== root) continue
    const name = value || 'unnamed'
    const list = found.get(name) ?? []
    for (const p of peers) if (!list.includes(p)) list.push(p)
    found.set(name, list)
  }
  return found
}

function collect(dom: ModuleDom): GroupUnits[] {
  const byGroup = new Map<string, GroupUnits>()
  const explicit = explicitUnits(dom.root)
  for (const [group, units] of explicit) byGroup.set(group, { group, units, resolved: true, explicit: true })
  const allExplicit = [...explicit.values()].flat()
  for (const marker of Array.from(dom.root.querySelectorAll('[pardot-repeatable]'))) {
    const name = marker.getAttribute('pardot-repeatable') || 'unnamed'
    // A marker inside one of those units is part of that unit's design, not a group of its own.
    if (byGroup.get(name)?.explicit || allExplicit.some((u) => u !== marker && u.contains(marker))) continue
    const entry = byGroup.get(name) ?? { group: name, units: [], resolved: true, explicit: false }
    byGroup.set(name, entry)
    const unit = unitFor(marker, dom.root)
    if (!unit) { entry.resolved = false; continue }
    // Every unit of a group is a sibling of the first one found.
    const siblings = elementChildren(unit.parentElement!).filter((c) => c.tagName === unit.tagName && signature(c) === signature(unit))
    for (const s of siblings) if (!entry.units.includes(s)) entry.units.push(s)
  }
  return [...byGroup.values()]
}

export function findRepeats(dom: ModuleDom): { groups: RepeatGroup[]; unitOf: UnitLookup } {
  const collected = collect(dom)
  const groups: RepeatGroup[] = collected.map((g) => ({
    group: g.group,
    units: Math.max(g.units.length, 1),
    canResize: g.resolved && g.units.length >= (g.explicit ? 1 : 2),
  }))
  const unitOf: UnitLookup = (el) => {
    let best: { group: string; index: number; depth: number } | null = null
    for (const g of collected) {
      if (!g.resolved || g.units.length < (g.explicit ? 1 : 2)) continue
      g.units.forEach((u, index) => {
        if (!u.contains(el)) return
        let depth = 0
        for (let n: Element | null = u; n; n = n.parentElement) depth++
        if (!best || depth > best.depth) best = { group: g.group, index, depth }
      })
    }
    return best ? { group: (best as { group: string }).group, index: (best as { index: number }).index } : null
  }
  return { groups, unitOf }
}

export function resizeRepeat(dom: ModuleDom, group: string, count: number): void {
  const g = collect(dom).find((x) => x.group === group)
  if (!g || !g.resolved || g.units.length < (g.explicit ? 1 : 2)) return
  const target = Math.max(count, 1)
  while (g.units.length < target) {
    const last = g.units[g.units.length - 1]
    const clone = last.cloneNode(true) as Element
    last.parentElement!.insertBefore(clone, last.nextSibling)
    g.units.push(clone)
  }
  while (g.units.length > target) {
    const last = g.units.pop()!
    last.parentElement!.removeChild(last)
  }
}
