import type { ModuleDom, UnitLookup } from './regions'

/** Pardot's own marker for a section of a module that can be taken out, e.g. a row holding a button. */
export const REMOVABLE_ATTR = 'pardot-removable'

export interface Removable {
  /** Where the choice to remove it is saved: the unit it is in (or root), then rm, its name and its number */
  key: string
  name: string
  /** The name as it reads in the panel: "dual-cta" becomes "Dual cta" */
  label: string
  /** The repeating unit (an article, say) the section is in, when it is in one */
  unit?: { group: string; index: number }
  el: Element
}

function humanise(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Section'
}

/** The sections marked pardot-removable, in the order they read in the module, each with its own key. */
export function removables(dom: ModuleDom, unitOf: UnitLookup): Removable[] {
  const counters = new Map<string, number>()
  return Array.from(dom.root.querySelectorAll(`[${REMOVABLE_ATTR}]`)).map((el) => {
    const name = el.getAttribute(REMOVABLE_ATTR)?.trim() || 'section'
    const unit = unitOf(el)
    const id = `${unit ? `${unit.group}[${unit.index}]` : 'root'}.rm.${name}`
    const n = counters.get(id) ?? 0
    counters.set(id, n + 1)
    return { key: `${id}.${n}`, name, label: humanise(name), ...(unit ? { unit } : {}), el }
  })
}

/** Takes out the sections the person has removed. What was typed in them is kept, so restoring one brings it back as it was. */
export function applyRemovals(dom: ModuleDom, values: Record<string, { removed?: boolean }>, unitOf: UnitLookup): void {
  for (const r of removables(dom, unitOf)) {
    if (values[r.key]?.removed) r.el.parentNode?.removeChild(r.el)
  }
}
