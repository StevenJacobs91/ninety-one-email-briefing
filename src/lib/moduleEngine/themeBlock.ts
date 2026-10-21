import { BRAND_TINTS } from '../brandTints'

const upper = (hex: string) => hex.toUpperCase()

/**
 * Rewrites the "Theming Options" block in a theme's master template (the .primary-color, .tint-0N-color and
 * .accent-color classes) to that theme's own brand colours. One master had another theme's block pasted in,
 * which painted a Leatherback Green email in Pinotage Burgundy wherever those classes are used.
 */
export function fixThemeBlock(head: string, primary: string, accent: string): string {
  const tints = BRAND_TINTS[primary.toLowerCase()]
  if (!tints) return head
  const set = (css: string, cls: string, colour: string) =>
    css.replace(
      new RegExp(`(\\.${cls}\\s*\\{)([^}]*)(\\})`),
      (_m, open: string, body: string, close: string) => `${open}${body.replace(/#[0-9a-fA-F]{6}\b/g, upper(colour))}${close}`,
    )
  return [
    ['primary-color', primary],
    ['tint-01-color', tints.tint01],
    ['tint-02-color', tints.tint02],
    ['tint-03-color', tints.tint03],
    ['accent-color', accent],
  ].reduce((css, [cls, colour]) => set(css, cls, colour), head)
}
