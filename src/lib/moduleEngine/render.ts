import type { ThemeCatalogue } from './catalogue'
import type { EmailBuild } from './build'
import { isAutoEditable, parseModuleDom, parseRegions, applyRegions, moduleHtml, type ParseDoc } from './regions'
import { applyBoxStyles } from './boxModel'
import { findRepeats, resizeRepeat } from './repeats'
import { applyDisclaimer } from '../disclaimer'
import { applyFooter } from './footer'
import { rgbToHex } from '../hexColours'
import { applyThemeTokens, themeTokensFor } from '../customModules'
import type { AppSettings } from '../../types/settings.types'

export interface ThemeAssets {
  logoUrl?: string
  stripeUrl?: string
  /** The slim stripe, for the small headers: a different, wider image than the standard stripe */
  slimStripeUrl?: string
  footerLogoUrl?: string
}

export interface RenderReport {
  droppedKeys: { instanceId: string; key: string }[]
  unknownModules: string[]
}

/**
 * Puts the brief's preview text in the hidden preview line at the top of the email's page shell, replacing the
 * library's "Update the Preview Line…" placeholder. The line ends in a long run of invisible spaces that stops the
 * email's own text showing after the preview, and those stay.
 */
export function withPreviewText(shellHead: string, text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return shellHead.replace(/Update the Preview Line on line \d+/, () => escaped)
}

const PLACEHOLDER = /https:\/\/placehold\.co\/[^"'\s)<>]+/g
const ASSET = /https?:\/\/[^"'\s)<>]+\/(91_logo_digital[^"'\s)<>]*|banner_stripes?_[^"'\s)<>]*|Footer_logo_[^"'\s)<>]*)/g

/** Unique placeholder image URLs in first-occurrence order; keys are `img:<n>`. */
export function listPlaceholders(html: string): string[] {
  return [...new Set(html.match(PLACEHOLDER) ?? [])]
}

// A person's photo: the library names them profile_<name>_<size>.<ext>.
const PROFILE_PHOTO = /\/profile_[^"'\s)<>/]+\.(?:png|jpe?g|webp)(?:[?#]|$)/i
// Brand logos and stripes follow the theme, and icons, spacers and tracking pixels are not content.
const NOT_MEDIA = /(91_logo|logo_|_logo|stripe|icon_|spacer|pixel|arrow)/i
const MIN_SIZE = 64

export interface ImageSlot {
  url: string
  kind: 'placeholder' | 'profile' | 'graphic'
}

const attrOf = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1]

/**
 * The images in a module that can be replaced. Placeholders come first, so the keys (`img:<n>`) saved
 * before photos and graphics were replaceable still point at the same image; people's photos follow, then
 * any other content image. An image the design marked as an editable region is edited as that region.
 */
export function listImageSlots(html: string): ImageSlot[] {
  const slots: ImageSlot[] = listPlaceholders(html).map((url): ImageSlot => ({ url, kind: 'placeholder' }))
  const seen = new Set(slots.map((x) => x.url))
  const profiles: ImageSlot[] = []
  const graphics: ImageSlot[] = []
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const url = attrOf(tag, 'src')
    if (!url || seen.has(url) || !/^https?:\/\//i.test(url) || /\spardot-region\s*=/i.test(tag)) continue
    if (PROFILE_PHOTO.test(url)) { seen.add(url); profiles.push({ url, kind: 'profile' }); continue }
    if (NOT_MEDIA.test(url)) continue
    const w = Number(attrOf(tag, 'width')), h = Number(attrOf(tag, 'height'))
    if ((w && w <= MIN_SIZE) || (h && h <= MIN_SIZE)) continue
    seen.add(url)
    graphics.push({ url, kind: 'graphic' })
  }
  return [...slots, ...profiles, ...graphics]
}

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Sets the alt text on every <img> whose source is `src`. */
function setAlt(html: string, src: string, alt: string): string {
  const value = escapeAttr(alt)
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!tag.includes(`src="${src}"`)) return tag
    return /\balt="[^"]*"/i.test(tag) ? tag.replace(/\balt="[^"]*"/i, `alt="${value}"`) : tag.replace(/<img\b/i, `<img alt="${value}"`)
  })
}

function applyAssets(html: string, assets?: ThemeAssets): string {
  if (!assets) return html
  return html.replace(ASSET, (url, file: string) => {
    if (file.startsWith('91_logo_digital')) return assets.logoUrl || url
    // The small headers hold a wide slim stripe (banner_stripe_…), the others the tall standard one (banner_stripes_…).
    // Putting the standard stripe in the slim slot squashes it, so an unset slim stripe leaves the library's own.
    if (file.startsWith('banner_stripe_')) return assets.slimStripeUrl || url
    if (file.startsWith('banner_stripes_')) return assets.stripeUrl || url
    return assets.footerLogoUrl || url
  })
}

export function renderBuild(
  build: EmailBuild,
  cat: ThemeCatalogue,
  opts: { parse: ParseDoc; assets?: ThemeAssets; /** The theme's accent colour, used for bold text */ accent?: string; /** The brief's preview text, shown beside the subject in an inbox */ previewText?: string; /** Settings' brand themes: the colours and images behind {{primary}}, {{accent}}, {{logo}} and the other tokens */ brandThemes?: AppSettings['brandThemes'] },
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
    const hasDisclaimer = m.disclaimerHtml !== undefined
    const hasFooter = m.footer !== undefined
    let html = original

    if (hasRepeats || hasRegions || hasStyles || hasDisclaimer || hasFooter) {
      const dom = parseModuleDom(original, opts.parse, { auto: isAutoEditable(m.moduleName) })
      for (const [group, count] of Object.entries(m.repeats)) resizeRepeat(dom, group, count)
      const { unitOf } = findRepeats(dom)
      const known = new Set(parseRegions(dom, unitOf).map((f) => f.key))
      for (const key of Object.keys(m.regions)) {
        if (!known.has(key)) report.droppedKeys.push({ instanceId: m.instanceId, key })
      }
      const regionEls = applyRegions(dom, m.regions, unitOf, { accent: opts.accent })
      if (m.styles) applyBoxStyles(dom, m.styles, regionEls)
      if (m.disclaimerHtml !== undefined) applyDisclaimer(dom.root, m.disclaimerHtml)
      if (m.footer) applyFooter(dom, m.footer, { parse: opts.parse, footerV1Html: cat.modules['Footer v1'] })
      html = moduleHtml(dom)
    }

    if (hasImages) {
      const slots = listImageSlots(original)
      for (const [key, img] of Object.entries(m.images)) {
        const slot = slots[Number(key.replace('img:', ''))]
        if (!slot || !img.src) continue
        html = html.split(slot.url).join(img.src)
        if (img.alt) html = setAlt(html, img.src, img.alt)
      }
    }
    parts.push(applyAssets(html, opts.assets))
  }

  // Setting a colour through the DOM comes back as rgb(...), so the finished email is put right here, not module by module.
  const html = (opts.previewText !== undefined ? withPreviewText(cat.shell.head, opts.previewText) : cat.shell.head) + parts.join('\n') + cat.shell.tail
  // Code written in Settings (a signature, a sign-off, a disclaimer) can use {{accent}} and the other theme tokens too,
  // and is only added to the email above, so they are filled in for the whole email here. Pardot rejects one left in.
  const tokens = { ...themeTokensFor(cat, { brandThemes: opts.brandThemes ?? [] }), ...(opts.accent ? { accent: opts.accent } : {}) }
  return { html: rgbToHex(applyThemeTokens(html, tokens)), report }
}
