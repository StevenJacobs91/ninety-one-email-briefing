import { parseStyle, serializeStyle, type Declaration } from './inlineStyle'
import type { ModuleDom } from './regions'

export const SIDES = ['top', 'right', 'bottom', 'left'] as const
export type Side = typeof SIDES[number]
export type SideValues = Record<Side, string>
export type Sides = Partial<Record<Side, string>>

/** What the builder lets someone override on one element: its spacing and its class. */
export interface BoxStyle {
  margin?: Sides
  padding?: Sides
  class?: string
}

export interface BoxRead {
  margin: SideValues
  padding: SideValues
  class: string
}

const EMPTY = (): SideValues => ({ top: '', right: '', bottom: '', left: '' })

/** CSS shorthand: one value is all four sides, two is vertical/horizontal, three is top/horizontal/bottom. */
function expand(value: string): SideValues {
  const v = value.trim().split(/\s+/).filter(Boolean)
  if (v.length === 0) return EMPTY()
  const [t, r = t, b = t, l = r] = v
  return { top: t, right: r, bottom: v.length >= 3 ? b : t, left: l }
}

function readSides(decls: Declaration[], prop: 'margin' | 'padding'): SideValues {
  let sides = EMPTY()
  for (const [p, v] of decls) {
    if (p === prop) sides = expand(v)
    else if (p.startsWith(`${prop}-`)) {
      const side = p.slice(prop.length + 1) as Side
      if (SIDES.includes(side)) sides = { ...sides, [side]: v }
    }
  }
  return sides
}

export function readBox(el: Element): BoxRead {
  const decls = parseStyle(el.getAttribute('style'))
  return { margin: readSides(decls, 'margin'), padding: readSides(decls, 'padding'), class: el.getAttribute('class') ?? '' }
}

const LENGTH = /^-?\d+(\.\d+)?(px|em|rem|%)?$/

/** A CSS length, a bare number meaning pixels, or `auto`. Empty means "leave as is"; anything else is rejected (null). */
export function normaliseLength(input: string): string | null {
  const v = input.trim()
  if (v === '') return ''
  if (v === 'auto') return 'auto'
  if (!LENGTH.test(v)) return null
  return /^-?\d+(\.\d+)?$/.test(v) && Number(v) !== 0 ? `${v}px` : v
}

/** Class names are letters, digits, hyphens and underscores only, separated by single spaces. */
export function normaliseClass(input: string): string {
  return input.replace(/[^\w\s-]/g, '').trim().split(/\s+/).filter(Boolean).join(' ')
}

function writeSides(decls: Declaration[], prop: 'margin' | 'padding', current: SideValues, patch: Sides | undefined): Declaration[] {
  if (!patch) return decls
  const next: SideValues = { ...current }
  let changed = false
  for (const side of SIDES) {
    const raw = patch[side]
    if (raw === undefined) continue
    const value = normaliseLength(raw)
    if (value === null || value === '') continue
    next[side] = value
    changed = true
  }
  if (!changed) return decls
  const rest = decls.filter(([p]) => p !== prop && !p.startsWith(`${prop}-`))
  const full = SIDES.map((s) => next[s] || '0').join(' ')
  return [...rest, [prop, full]]
}

export function applyBox(el: Element, style: BoxStyle): void {
  const read = readBox(el)
  let decls = parseStyle(el.getAttribute('style'))
  decls = writeSides(decls, 'margin', read.margin, style.margin)
  decls = writeSides(decls, 'padding', read.padding, style.padding)
  if (style.margin || style.padding) {
    if (decls.length) el.setAttribute('style', serializeStyle(decls))
    else el.removeAttribute('style')
  }
  if (style.class !== undefined) {
    const cls = normaliseClass(style.class)
    if (cls) el.setAttribute('class', cls)
    else el.removeAttribute('class')
  }
}

/** The outer cell that carries a module's padding, or the first cell when none does. */
export function moduleContainer(dom: ModuleDom): Element | null {
  const cells = Array.from(dom.root.querySelectorAll('td'))
  return cells.find((td) => /(^|;)\s*padding\s*:/i.test(td.getAttribute('style') ?? '')) ?? cells[0] ?? null
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'])

/** Margin only holds on block text elements in email; cells and links ignore it. */
export function allowsMargin(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase())
}

/** Applies saved overrides. Keys with no matching element are ignored. */
export function applyBoxStyles(dom: ModuleDom, styles: Record<string, BoxStyle>, regionEls: Map<string, Element[]>): void {
  for (const [key, style] of Object.entries(styles)) {
    const targets = key === 'container' ? [moduleContainer(dom)].filter((e): e is Element => !!e) : regionEls.get(key) ?? []
    for (const el of targets) applyBox(el, style)
  }
}
