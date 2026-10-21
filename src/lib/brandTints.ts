// The brand guideline's exact Tint-01/02/03 for each primary colour. Anything calculated from the
// primary (as earlier versions did) drifts from these, sometimes badly: Marula's darkest tint came
// out pure black and Springbok's lightest as #ffffe8.

export interface Tints {
  tint01: string
  tint02: string
  tint03: string
}

export const BRAND_TINTS: Record<string, Tints> = {
  '#134848': { tint01: '#1d4f4f', tint02: '#114141', tint03: '#0d3232' }, // Leatherback Green
  '#0a3323': { tint01: '#16543a', tint02: '#10422d', tint03: '#072419' }, // Marula Green
  '#591739': { tint01: '#652043', tint02: '#511536', tint03: '#3c0e2e' }, // Pinotage Burgundy
  '#e8e5ce': { tint01: '#eeebda', tint02: '#dbd8c0', tint03: '#b3aa9c' }, // Springbok Cream
  '#221b3b': { tint01: '#292047', tint02: '#1e1834', tint03: '#181329' }, // Agulhas Indigo
  '#74908d': { tint01: '#809a96', tint02: '#698282', tint03: '#54666d' }, // Galjoen Gray
}

/** The tints earlier versions calculated by brightening or darkening the primary. */
export function legacyDerivedTints(hex: string): Tints {
  const adj = (h: string, pct: number) => {
    const n = parseInt(h.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + Math.round(2.55 * pct)))
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + Math.round(2.55 * pct)))
    const b = Math.min(255, Math.max(0, (n & 0xff) + Math.round(2.55 * pct)))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }
  return { tint01: adj(hex, 10), tint02: adj(hex, -5), tint03: adj(hex, -20) }
}

/** The brand's tints for a primary colour; a colour outside the brand gets calculated ones. */
export function brandTints(primary: string): Tints {
  return BRAND_TINTS[primary.toLowerCase()] ?? legacyDerivedTints(primary)
}

/**
 * Brings a saved theme's tints into line with the brand when they are still the old calculated
 * values (the team never chose them). Tints someone set themselves, and custom themes, are kept.
 */
export function normaliseTints<T extends { primary: string; tint01?: string; tint02?: string; tint03?: string }>(theme: T): T {
  const brand = BRAND_TINTS[theme.primary.toLowerCase()]
  if (!brand) return theme
  const old = legacyDerivedTints(theme.primary)
  const same = (a?: string, b?: string) => !!a && a.toLowerCase() === b
  const isOld = same(theme.tint01, old.tint01) && same(theme.tint02, old.tint02) && same(theme.tint03, old.tint03)
  return isOld ? { ...theme, ...brand } : theme
}
