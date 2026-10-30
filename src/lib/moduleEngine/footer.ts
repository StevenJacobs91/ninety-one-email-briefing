import type { SignoffEntry } from '../../types/settings.types'
import { signoffHtml } from '../signoff'
import { parseStyle } from './inlineStyle'
import { parseModuleDom, type ModuleDom, type ParseDoc } from './regions'

export const isFooterModule = (moduleName: string): boolean => /^Footer/i.test(moduleName)

/** How a footer is set up in a build: each part can be changed without touching the library design. */
export interface FooterOptions {
  /** Take the sign-off text (the message before the signature) out */
  removeSignoff?: boolean
  /** A signature chosen from Settings in place of the module's own, or 'none' to take it out */
  signature?: { entry: SignoffEntry } | 'none'
  /** Show or hide the social icons in the footer tail; unset keeps what the module has */
  social?: boolean
}

export interface FooterSections {
  /** The message before the signature */
  signoff: Element[]
  /** "Kind regards" down to the last line of the signature block */
  signature: Element[]
  /** The row with the logo, the links and the social icons */
  tail: Element | null
  /** The table of social icons, if the tail has one */
  social: Element | null
  /** The table of "Visit website / View online / Privacy notice" links */
  links: Element | null
}

// The line that opens a signature. Footers differ in what they say but all open with one of these.
export const SIGN_OFF_WORDS =/^(kind regards|best regards|warm regards|regards|best|sincerely|yours sincerely|many thanks|with thanks)[,.!]?$/i

const clean = (el: Element) => (el.textContent ?? '').replace(/[\s ]+/g, ' ').trim()

/**
 * Finds the three parts of a footer from its structure alone, so it holds for every theme: the tail is the row
 * that carries the logo, and the row above holds the message and the signature, which begins at the sign-off word.
 */
export function footerSections(root: Element): FooterSections {
  const rows = Array.from(root.children).filter((c) => c.tagName === 'TR')
  const tail = rows.find((r) => r.querySelector('a[href*="logo_footer"], img[src*="Footer_logo"]')) ?? null
  const textRow = rows.find((r) => r !== tail && r.querySelector('p')) ?? null
  const paragraphs = textRow ? Array.from(textRow.querySelectorAll('p')).filter((p) => !p.parentElement?.closest('p')) : []
  const start = paragraphs.findIndex((p) => SIGN_OFF_WORDS.test(clean(p)))
  return {
    signoff: start === -1 ? paragraphs : paragraphs.slice(0, start),
    signature: start === -1 ? [] : paragraphs.slice(start),
    tail,
    social: tail?.querySelector('img[src*="icon_social"]')?.closest('table') ?? null,
    links: tail?.querySelector('a[href*="privacy-notice"]')?.closest('table') ?? null,
  }
}

const styleOf = (el: Element | undefined, prop: string): string | undefined => {
  const found = parseStyle(el?.getAttribute('style') ?? '').find(([p]) => p === prop)
  return found?.[1]
}

/** The text style of the module's own signature, so a chosen one looks like it belongs, in every theme. */
function signatureLook(signature: Element[]): { textStyle: string; colour: string; linkColour: string } {
  const first = signature[0]
  const colour = styleOf(first, 'color') ?? 'inherit'
  const link = signature.flatMap((p) => Array.from(p.querySelectorAll('a'))).map((a) => styleOf(a, 'color')).find(Boolean)
  const pick = (prop: string, fallback: string) => styleOf(first, prop) ?? fallback
  return {
    colour,
    linkColour: link ?? colour,
    textStyle: `font-family: ${pick('font-family', 'Ninety One Visuelt Light, arial, helvetica, sans-serif')}; font-size: ${pick('font-size', '16px')}; mso-line-height-rule: exactly; line-height: ${pick('line-height', '22px')}; font-weight: normal; text-align: left; color: ${colour};`,
  }
}

function remove(els: Element[]): void {
  for (const el of els) el.parentNode?.removeChild(el)
}

/** When the message and signature are both gone, the row that held them goes too. */
function dropEmptyRow(sections: FooterSections, root: Element): void {
  const rows = Array.from(root.children).filter((r) => r.tagName === 'TR')
  const empty = rows.find((r) => r !== sections.tail && !r.querySelector('p, img, a'))
  if (empty && rows.length > 1) empty.parentNode?.removeChild(empty)
}

/** Applies the footer options to the module's DOM, after any edits to its text have been made. */
export function applyFooter(
  dom: ModuleDom,
  footer: FooterOptions,
  ctx: { parse: ParseDoc; footerV1Html?: string },
): void {
  const root = dom.root
  const sections = footerSections(root)

  if (footer.removeSignoff) remove(sections.signoff)

  if (footer.signature && sections.signature.length > 0) {
    if (footer.signature !== 'none' && footer.signature.entry.text.trim() !== '') {
      const look = signatureLook(sections.signature)
      const holder = root.ownerDocument.createElement('div')
      holder.innerHTML = signoffHtml(footer.signature.entry, { accent: look.colour, textStyle: look.textStyle, linkColour: look.linkColour })
      const first = sections.signature[0]
      while (holder.firstChild) first.parentNode?.insertBefore(holder.firstChild, first)
    }
    remove(sections.signature)
  }

  if (footer.removeSignoff || footer.signature) dropEmptyRow(sections, root)

  if (footer.social === false && sections.social) remove([sections.social])
  if (footer.social === true && !sections.social && sections.links && ctx.footerV1Html) {
    const donor = footerSections(parseModuleDom(ctx.footerV1Html, ctx.parse).root).social
    if (donor) sections.links.parentNode?.insertBefore(donor.cloneNode(true), sections.links.nextSibling)
  }
}
