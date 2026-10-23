// Email colours are written as hex. Design tools and the browser's own serialiser (which turns a colour
// set through the DOM into rgb(...)) produce rgb(), so every module and every finished email passes through here.
const RGB = /rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)/gi

// The supplied library carries Springbok Cream as rgb(232, 229, 207), one off the brand's #e8e5ce.
const MISROUNDED_CREAM = '#e8e5cf'
const BRAND_CREAM = '#e8e5ce'

const part = (n: number) => n.toString(16).padStart(2, '0')

/**
 * Every opaque `rgb(r, g, b)` / `rgba(r, g, b, 1)` in the markup as `#rrggbb`. A colour with real transparency has no
 * safe hex form in an email client, and a channel above 255 is not a colour, so both are left as written.
 */
export function rgbToHex(html: string): string {
  return html.replace(RGB, (whole, r: string, g: string, b: string, alpha?: string) => {
    const channels = [Number(r), Number(g), Number(b)]
    if (channels.some((c) => c > 255)) return whole
    if (alpha !== undefined) {
      const a = alpha.endsWith('%') ? Number(alpha.slice(0, -1)) / 100 : Number(alpha)
      if (a !== 1) return whole
    }
    const hex = `#${channels.map(part).join('')}`
    return hex === MISROUNDED_CREAM ? BRAND_CREAM : hex
  })
}

/** Colours in the markup that are still not hex: rgb(), rgba(), hsl() and hsla(). */
export function nonHexColours(html: string): string[] {
  return html.match(/(?:rgba?|hsla?)\([^)]*\)/gi) ?? []
}
