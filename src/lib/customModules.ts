import type { AppSettings, HtmlModuleConfig, ModuleCategory } from '../types/settings.types'
import { getThemeColours } from './themeColours'
import type { ThemeCatalogue } from './moduleEngine/catalogue'
import type { PickerGroup } from './moduleKinds'

export interface ThemeColours {
  primary: string
  accent: string
  tint01?: string
  tint02?: string
  tint03?: string
  /** The theme's header logo, standard stripe, slim stripe and footer logo */
  logo?: string
  stripe?: string
  slimStripe?: string
  footerLogo?: string
  /** The header type's anniversary badge, when the code belongs to a header */
  anniversary?: string
  /** Where a header's replaceable background image goes: a placeholder the builder swaps for the brief's image */
  heroImage?: string
}

export const THEME_TOKENS = ['primary', 'accent', 'tint01', 'tint02', 'tint03', 'logo', 'stripe', 'slimStripe', 'footerLogo', 'anniversary', 'heroImage'] as const

/** The builder swaps this for the header image chosen on the email (the same way it replaces any placeholder image). */
export const HERO_PLACEHOLDER = 'https://placehold.co/640x270/221b3b/e8e5ce.jpg?text=Background+image+640x270'

/** Whether a header's code asks for a replaceable background image. */
export function usesHeroImage(html: string | undefined): boolean {
  return (html ?? '').includes('{{heroImage}}')
}

/**
 * `{{primary}}`, `{{accent}}`, `{{tint01}}`–`{{tint03}}` and the theme's images `{{logo}}`, `{{stripe}}`, `{{slimStripe}}`,
 * `{{footerLogo}}` (and a header's `{{anniversary}}`) become that theme's values, so one module or header suits every
 * theme. A token with no value for the theme, and other {{merge tags}}, are left as they are.
 */
export function applyThemeTokens(html: string, theme: ThemeColours): string {
  return THEME_TOKENS.reduce((out, token) => {
    const value = theme[token]
    return value ? out.split(`{{${token}}}`).join(value) : out
  }, html)
}

/** What is wrong with a module's code, or null. Library modules are bare table rows, and an email cannot run scripts. */
export function validateModuleHtml(html: string): string | null {
  const code = html.trim()
  if (!code) return 'Paste the module\'s HTML.'
  if (!/^(?:<!--[\s\S]*?-->\s*)*<tr[\s>]/i.test(code)) return 'Email modules are table rows: the code should start with <tr>.'
  if (/<script\b/i.test(code)) return 'Scripts are not allowed in an email.'
  if (/\son[a-z]+\s*=/i.test(code)) return 'Event handlers such as onclick are not allowed in an email.'
  return null
}

/** The theme's library with the custom modules added, in the theme's colours. A custom module named like a built-in one replaces it. */
export function mergeCustomModules(catalogue: ThemeCatalogue, modules: readonly HtmlModuleConfig[], theme: ThemeColours): ThemeCatalogue {
  const custom = modules.filter((m) => m.enabled && (m.html ?? '').trim() !== '')
  if (custom.length === 0) return catalogue
  const merged = { ...catalogue.modules }
  const order = [...catalogue.order]
  for (const m of custom) {
    merged[m.label] = applyThemeTokens(m.html!.trim(), theme)
    if (!order.includes(m.label)) order.push(m.label)
  }
  return { ...catalogue, modules: merged, order }
}

/** Modules switched off in Settings, which the picker leaves out. */
export function disabledModuleNames(modules: readonly HtmlModuleConfig[]): Set<string> {
  return new Set(modules.filter((m) => !m.enabled).map((m) => m.label))
}

const GROUP: Record<ModuleCategory, PickerGroup> = {
  Headers: 'Other', Content: 'Content', CTAs: 'Calls to action', Events: 'Events', Speakers: 'People',
  Articles: 'Articles', Media: 'Media', Navigation: 'Navigation', Footers: 'Other',
}

/** The picker group a custom module's category belongs to. */
export function categoryGroup(category: ModuleCategory): PickerGroup {
  return GROUP[category]
}

// When Settings has no image for a theme, the one its own library modules use stands in.
const IN_LIBRARY = {
  logo: /https?:\/\/[^"'\s)<>]*91_logo_digital[^"'\s)<>]*/i,
  // The standard stripe is tall (banner_stripes_… or …Stripes_200x234); the slim one is wide (banner_stripe_…_600x250).
  stripe: /https?:\/\/[^"'\s)<>]*(?:banner_stripes_|Stripes_\d+x\d+)[^"'\s)<>]*/i,
  slimStripe: /https?:\/\/[^"'\s)<>]*banner_stripe_[^"'\s)<>]*/i,
} as const

/** The theme's colours and images for the tokens, from Settings → Brand Themes, else from the theme's own library modules. */
export function themeTokensFor(
  catalogue: ThemeCatalogue,
  settings: Pick<AppSettings, 'brandThemes'>,
  /** Images set on a header type itself: used where the theme has none, before the library's own */
  own: Partial<Pick<ThemeColours, 'logo' | 'stripe' | 'slimStripe'>> = {},
): ThemeColours {
  const theme = (settings.brandThemes ?? []).find((t) => t.id === catalogue.themeId)
  const fallback = getThemeColours(catalogue.themeId)
  const library = `${catalogue.shell.head} ${Object.values(catalogue.modules).join(' ')}`
  const found = (k: keyof typeof IN_LIBRARY) => library.match(IN_LIBRARY[k])?.[0]
  return {
    primary: theme?.primary ?? fallback.primary,
    accent: theme?.accent ?? fallback.accent,
    tint01: theme?.tint01,
    tint02: theme?.tint02,
    tint03: theme?.tint03,
    logo: theme?.logoUrl || own.logo || found('logo'),
    stripe: theme?.stripeUrl || own.stripe || found('stripe'),
    slimStripe: theme?.slimStripeUrl || own.slimStripe || found('slimStripe'),
    footerLogo: theme?.footerLogoUrl || undefined,
  }
}

/** The library for a theme with the custom modules from Settings added, in that theme's colours. */
export function withCustomModules(catalogue: ThemeCatalogue, settings: Pick<AppSettings, 'htmlModules' | 'brandThemes'>): ThemeCatalogue {
  const modules = settings.htmlModules ?? []
  if (!modules.some((m) => m.html)) return catalogue
  return mergeCustomModules(catalogue, modules, themeTokensFor(catalogue, settings))
}
