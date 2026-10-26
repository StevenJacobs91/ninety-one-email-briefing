import { addModule, newModule, setRegion, swapModule, type BuildModule, type EmailBuild } from './build'
import type { ThemeCatalogue } from './catalogue'
import { parseModuleDom, parseRegions, regionElements, type ParseDoc } from './regions'
import type { AppSettings, HeaderTypeConfig } from '../../types/settings.types'
import { applyThemeTokens, HERO_PLACEHOLDER, themeTokensFor, usesHeroImage, validateModuleHtml, withCustomModules } from '../customModules'

export interface SeedOptions {
  headerTypeId?: string
  /** The header types in Settings, so a header type with its own code can be chosen */
  headers?: readonly HeaderTypeConfig[]
  regions?: string[]
}

const HEADER_MODULE: Record<string, string | null> = {
  'standard-bg-image': 'Header with Image',
  standard: 'Plain Logo Header',
  slim: 'Small Header v2',
  'standard-35yr': 'Small Header',
  'slim-35yr': null, // pending: the library has no module for it yet (§8.1)
}

/** A header type's own code, if it has some the builder can use. */
function usableSnippet(h: HeaderTypeConfig | undefined): string | null {
  const code = (h?.htmlSnippet ?? '').trim()
  return code && validateModuleHtml(code) === null ? code : null
}

/**
 * The library module a header type uses. A header type with its own HTML snippet in Settings → Headers uses that:
 * it replaces the library's module for a built-in type, and is a module of its own for a type added in Settings.
 */
export function headerModuleFor(headerTypeId: string | undefined, headers?: readonly HeaderTypeConfig[]): string | null {
  const custom = headers?.find((h) => h.id === headerTypeId)
  const mapped = headerTypeId && headerTypeId in HEADER_MODULE ? HEADER_MODULE[headerTypeId] : undefined
  if (mapped) return mapped
  if (custom && usableSnippet(custom)) return `Header: ${custom.label}`
  if (!headerTypeId) return 'Header with Image'
  return mapped === null ? null : 'Header with Image'
}

/** Whether the builder asks for a background image for this header type: its setting says so, or its code has a place for one. */
export function headerRequiresHero(h: HeaderTypeConfig | undefined): boolean {
  return !!h && (h.requiresHeroImage || (usableSnippet(h) !== null && usesHeroImage(h.htmlSnippet)))
}

/** The library with each header type's own code added, in the theme's colours and images. */
export function withCustomHeaders(catalogue: ThemeCatalogue, settings: Pick<AppSettings, 'headers' | 'brandThemes'>): ThemeCatalogue {
  const withCode = (settings.headers ?? []).filter((h) => usableSnippet(h))
  if (withCode.length === 0) return catalogue
  const modules = { ...catalogue.modules }
  const order = [...catalogue.order]
  for (const h of withCode) {
    const name = headerModuleFor(h.id, [h])
    if (!name) continue
    const tokens = themeTokensFor(catalogue, settings, { logo: h.assets?.logoUrl, stripe: h.assets?.stripeUrl, slimStripe: h.assets?.slimStripeUrl })
    modules[name] = applyThemeTokens(usableSnippet(h)!, { ...tokens, anniversary: h.assets?.thirtyFiveYearGraphicUrl || tokens.anniversary, heroImage: HERO_PLACEHOLDER })
    if (!order.includes(name)) order.push(name)
  }
  return { ...catalogue, modules, order }
}

/** The library for a theme as the builder uses it: Settings' custom modules and header code added. */
export function withCustomLibrary(catalogue: ThemeCatalogue, settings: Pick<AppSettings, 'htmlModules' | 'headers' | 'brandThemes'>): ThemeCatalogue {
  return withCustomHeaders(withCustomModules(catalogue, settings), settings)
}

export function seedBuild(themeId: string, opts: SeedOptions = {}): EmailBuild {
  const header = headerModuleFor(opts.headerTypeId, opts.headers) ?? 'Plain Logo Header'
  const disclaimer = opts.regions?.includes('UK') ? 'Disclaimer - UK' : 'Disclaimer'
  return {
    version: 1,
    themeId,
    headerTypeId: opts.headerTypeId,
    modules: [
      newModule(header, 'header'),
      newModule('Body Content', 'body'),
      newModule('Footer v1', 'footer'),
      newModule(disclaimer, 'disclaimer'),
    ],
  }
}

export interface BriefBindings {
  headline: string
  subHeadline: string
  bodyIntro: string
}

function headingKeys(html: string, parse: ParseDoc): { h1?: string; h2?: string } {
  const dom = parseModuleDom(html, parse)
  const fields = parseRegions(dom)
  const els = regionElements(dom)
  const out: { h1?: string; h2?: string } = {}
  fields.forEach((f, i) => {
    const tag = els[i].tagName.toLowerCase()
    if (tag === 'h1' && !out.h1) out.h1 = f.key
    if (tag === 'h2' && !out.h2) out.h2 = f.key
  })
  return out
}

// A region the user edited in the builder (a value with no binding) is never
// overwritten; a bound region follows the brief field. Empty fields bind nothing.
function bindOne(b: EmailBuild, m: BuildModule, key: string | undefined, field: string, value: string): EmailBuild {
  if (!key || !value) return b
  const edited = m.regions[key] !== undefined && m.boundFields[key] === undefined
  if (edited) return b
  return setRegion(b, m.instanceId, key, { value }, field)
}

export function bindBrief(build: EmailBuild, brief: BriefBindings, cat: ThemeCatalogue, parse: ParseDoc): EmailBuild {
  let b = build
  const header = b.modules.find((m) => m.slot === 'header')
  if (header && cat.modules[header.moduleName]) {
    const keys = headingKeys(cat.modules[header.moduleName], parse)
    b = bindOne(b, header, keys.h1, 'headline', brief.headline)
    const h = b.modules.find((m) => m.slot === 'header')!
    b = bindOne(b, h, keys.h2, 'subHeadline', brief.subHeadline)
  }
  const body = b.modules.find((m) => m.slot === 'body')
  if (body) b = bindOne(b, body, 'root.0', 'bodyIntro', brief.bodyIntro)
  return b
}

const LEGACY_MODULES: Record<string, string> = {
  'header-small': 'Small Header',
  'header-image': 'Header with Image',
  greeting: 'Greeting',
  'body-content': 'Body Content',
  'body-content-list': 'Body Content List',
  'body-inner-content': 'Body Inner Content',
  'inner-content-v1': 'Inner Content V1',
  'inner-content-v2': 'Inner Content V2',
  'inner-content-v3': 'Inner Content V3',
  'numbered-section-v1': 'Numbered Section V1',
  'numbered-section-v2': 'Numbered Section V2',
  podcast: 'Podcast Module',
  'video-rollover': 'Video Play Rollover',
  'cta-single-primary': 'Single Primary CTA',
  'cta-primary-secondary': 'Primary and Secondary CTA',
  'cta-dual-secondary': 'Dual Secondary CTA',
  'cta-single-secondary': 'Single Secondary CTA',
  'cta-1primary-2secondary': '1x Primary CTA 2x Secondary CTA',
  'event-registration-1cta': 'Event Registration 1x CTA',
  'event-registration-2cta': 'Event Registration 2x CTA',
  'event-registration-v3': 'Event Registration v3',
  'event-registration-v4': 'Event Registration v4',
  'event-registration-v5': 'Event Registration v5',
  'itinerary-table': 'Itinerary Table',
  'speaker-2pm-1cta': '2x PM 1x CTA',
  'speaker-2pm-3cta': '2x PM 3x CTA',
  'speaker-1pm': 'PM 1',
  'speakers-2col': 'Speakers',
  'speakers-3col': '3x Speakers',
  'article-list-v1': 'Article List',
  'article-list-v2': 'Article List v2',
  'article-list-v3': 'Article List V3',
  'gallery-v1': 'Gallery V1',
  'gallery-v2': 'Gallery V2',
  'tabs-main': 'Main Tabs',
  'tabs-anchors': 'Tabs Anchors',
  'footer-v1': 'Footer v1',
  'footer-v2': 'Footer V2',
  'footer-v3': 'Footer V3',
}

export interface LegacyContent {
  modules?: string[]
  sections?: { heading: string; body: string }[]
}

// Read path for briefs saved before builds existed. Nothing is dropped
// silently: unknown ids are returned, and sections become Body Content modules.
export function buildFromLegacy(
  content: LegacyContent, themeId: string, opts: SeedOptions,
): { build: EmailBuild; unmapped: string[] } {
  let b = seedBuild(themeId, opts)
  const unmapped: string[] = []
  let bodyUsed = false
  for (const id of content.modules ?? []) {
    const name = LEGACY_MODULES[id]
    if (!name) { unmapped.push(id); continue }
    if (id.startsWith('header-')) {
      b = swapModule(b, b.modules.find((m) => m.slot === 'header')!.instanceId, name)
    } else if (id.startsWith('footer-')) {
      b = swapModule(b, b.modules.find((m) => m.slot === 'footer')!.instanceId, name)
    } else if (id === 'body-content' && !bodyUsed) {
      bodyUsed = true
    } else {
      b = addModule(b, name, b.modules.length)
    }
  }
  for (const s of content.sections ?? []) {
    if (!s.heading && !s.body) continue
    b = addModule(b, 'Body Content', b.modules.length)
    const added = [...b.modules].reverse().find((m) => m.moduleName === 'Body Content' && !m.slot)!
    const value = `${s.heading ? `<strong>${s.heading}</strong><br>` : ''}${s.body}`
    b = setRegion(b, added.instanceId, 'root.0', { value })
  }
  return { build: b, unmapped }
}
