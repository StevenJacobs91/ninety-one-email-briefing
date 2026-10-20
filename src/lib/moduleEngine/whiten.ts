// The Springbok Cream themes differ from a white theme only in their cream
// neutrals, so a white theme is the matching Springbok Cream theme with those
// neutrals replaced by white and the light greys already used in the masters.
// Accent colours, text grey (#424242) and all image assets are left alone.
const CREAM = /(bgcolor="|background(?:-color)?:\s*)?#(eeebda|dbd8c0|b3aa9c|e8e5ce)\b/gi

export function whiten(html: string): string {
  return html.replace(CREAM, (_m, fill: string | undefined, hex: string) => {
    const prefix = fill ?? ''
    switch (hex.toLowerCase()) {
      case 'eeebda': return `${prefix}#ffffff`
      case 'e8e5ce': return `${prefix}#ffffff`
      case 'dbd8c0': return `${prefix}#f4f4f4`
      default: return `${prefix}${fill ? '#e4e5e6' : '#afafaf'}`
    }
  })
}
