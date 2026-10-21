// The email's @font-face rules point at the Pardot host, which sends no CORS headers, so a browser will not load
// those fonts into the app's preview iframes and the text falls back to Arial. For previews only, point the brand
// font files at the app's own copies in /fonts (see index.css and `npm run fonts:fetch`). The HTML that is sent or
// downloaded keeps the Pardot URLs, which email clients load without CORS.

export const BRAND_FONT_FILES = [
  'NinetyOneVisueltDisplay_Regular.woff',
  'NinetyOneVisuelt_Regular.woff',
  'NinetyOneVisuelt_Light.woff',
  'NinetyOneVisuelt_Medium.woff',
]

export function selfHostFonts(html: string, origin: string): string {
  const base = origin.replace(/\/+$/, '')
  const files = BRAND_FONT_FILES.map((f) => f.replace('.', '\\.')).join('|')
  const pattern = new RegExp(`https?://[^'")\\s]*?/(${files})(?=['")\\s])`, 'g')
  return html.replace(pattern, (_url, file: string) => `${base}/fonts/${file}`)
}
