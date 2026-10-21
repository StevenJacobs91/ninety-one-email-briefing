import type { ThemeCatalogue } from './catalogue'
import type { EmailBuild } from './build'
import { parseModuleDom, parseRegions, applyRegions, moduleHtml, type ParseDoc } from './regions'
import { applyBoxStyles } from './boxModel'
import { findRepeats, resizeRepeat } from './repeats'

export interface ThemeAssets {
  logoUrl?: string
  stripeUrl?: string
  footerLogoUrl?: string
}

export interface RenderReport {
  droppedKeys: { instanceId: string; key: string }[]
  unknownModules: string[]
}

const PLACEHOLDER = /https:\/\/placehold\.co\/[^"'\s)<>]+/g
const ASSET = /https?:\/\/[^"'\s)<>]+\/(91_logo_digital[^"'\s)<>]*|banner_stripes?_[^"'\s)<>]*|Footer_logo_[^"'\s)<>]*)/g

/** Unique placeholder image URLs in first-occurrence order; keys are `img:<n>`. */
export function listPlaceholders(html: string): string[] {
  return [...new Set(html.match(PLACEHOLDER) ?? [])]
}

function applyAssets(html: string, assets?: ThemeAssets): string {
  if (!assets) return html
  return html.replace(ASSET, (url, file: string) => {
    if (file.startsWith('91_logo_digital')) return assets.logoUrl || url
    if (file.startsWith('banner_stripe')) return assets.stripeUrl || url
    return assets.footerLogoUrl || url
  })
}

export function renderBuild(
  build: EmailBuild,
  cat: ThemeCatalogue,
  opts: { parse: ParseDoc; assets?: ThemeAssets; /** The theme's accent colour, used for bold text */ accent?: string },
): { html: string; report: RenderReport } {
  const report: RenderReport = { droppedKeys: [], unknownModules: [] }
  const parts: string[] = []

  for (const m of build.modules) {
    const original = cat.modules[m.moduleName]
    if (original === undefined) {
      report.unknownModules.push(m.moduleName)
      continue
    }
    const hasRepeats = Object.keys(m.repeats).length > 0
    const hasRegions = Object.keys(m.regions).length > 0
    const hasImages = Object.keys(m.images).length > 0
    const hasStyles = Object.keys(m.styles ?? {}).length > 0
    let html = original

    if (hasRepeats || hasRegions || hasStyles) {
      const dom = parseModuleDom(original, opts.parse)
      for (const [group, count] of Object.entries(m.repeats)) resizeRepeat(dom, group, count)
      const { unitOf } = findRepeats(dom)
      const known = new Set(parseRegions(dom, unitOf).map((f) => f.key))
      for (const key of Object.keys(m.regions)) {
        if (!known.has(key)) report.droppedKeys.push({ instanceId: m.instanceId, key })
      }
      const regionEls = applyRegions(dom, m.regions, unitOf, { accent: opts.accent })
      if (m.styles) applyBoxStyles(dom, m.styles, regionEls)
      html = moduleHtml(dom)
    }

    if (hasImages) {
      const placeholders = listPlaceholders(original)
      for (const [key, img] of Object.entries(m.images)) {
        const url = placeholders[Number(key.replace('img:', ''))]
        if (url && img.src) html = html.split(url).join(img.src)
      }
    }
    parts.push(applyAssets(html, opts.assets))
  }

  return { html: cat.shell.head + parts.join('\n') + cat.shell.tail, report }
}
