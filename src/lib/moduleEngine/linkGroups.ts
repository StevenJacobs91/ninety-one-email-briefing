import type { ModuleDom, UnitLookup } from './regions'
import { findRepeats } from './repeats'
import { slugifyUtm } from '../utm'

/** Marks the links of a module that share one address: data-link="article" on each of them. */
export const LINK_ATTR = 'data-link'
/** Names a link in its utm_content, in place of the one worked out from where it sits. */
export const LINK_UTM_ATTR = 'data-utm-content'

export interface LinkGroup {
  group: string
  /** The links in the group, in the order they read in the module */
  anchors: Element[]
}

/**
 * The groups of links the design marks data-link="name". Links with the same name share one address when they are in
 * the same repeating unit (an article, say) or, outside any unit, in the same module. In the order each group first
 * appears.
 */
export function linkGroups(dom: ModuleDom): LinkGroup[] {
  const anchors = Array.from(dom.root.querySelectorAll(`a[${LINK_ATTR}]`))
  if (anchors.length === 0) return []
  const { unitOf } = findRepeats(dom)
  const found = new Map<string, LinkGroup>()
  for (const a of anchors) {
    const group = a.getAttribute(LINK_ATTR)?.trim() || 'link'
    const unit = unitOf(a)
    const scope = unit ? `${unit.group}[${unit.index}]` : 'root'
    const id = `${scope}\u0000${group}`
    const entry = found.get(id) ?? { group, anchors: [] }
    entry.anchors.push(a)
    found.set(id, entry)
  }
  return [...found.values()]
}

/** What a link is in its article: the picture, the heading, or (anything else) the button. */
function roleOf(a: Element): string {
  if (a.querySelector('img')) return 'image'
  if (a.closest('h1,h2,h3,h4,h5,h6') || a.closest('[pardot-region="heading"]')) return 'heading'
  return 'cta'
}

function withUtmContent(href: string, value: string): string {
  try {
    const url = new URL(href.replace(/&amp;/gi, '&'))
    // Only web addresses are tracked, and a utm_content someone typed is theirs to keep.
    if (!/^https?:$/.test(url.protocol) || url.searchParams.has('utm_content')) return href
    url.searchParams.set('utm_content', value)
    return url.toString()
  } catch {
    return href
  }
}

/**
 * Gives each link in a group its own utm_content so a report shows which link was clicked: the group, the unit's
 * number when it is in a repeating unit, and what the link is, e.g. article-2-heading. A link can name itself with
 * data-utm-content instead.
 */
export function applyLinkUtm(dom: ModuleDom, unitOf: UnitLookup): void {
  for (const g of linkGroups(dom)) {
    const unit = unitOf(g.anchors[0])
    for (const a of g.anchors) {
      const href = a.getAttribute('href')
      if (!href) continue
      const named = a.getAttribute(LINK_UTM_ATTR)?.trim()
      const value = slugifyUtm(named || [g.group, unit ? String(unit.index + 1) : '', roleOf(a)].filter(Boolean).join('-'))
      if (value) a.setAttribute('href', withUtmContent(href, value))
    }
  }
}
