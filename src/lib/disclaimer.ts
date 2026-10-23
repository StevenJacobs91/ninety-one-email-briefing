import type { LegalDisclaimerConfig } from '../types/settings.types'
import { richToParagraphs, sanitizeRich } from './moduleEngine/regions'

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A disclaimer as rich text: what was written with formatting, else the older plain text, one paragraph per line. */
export function disclaimerSource(d: Pick<LegalDisclaimerConfig, 'text' | 'html'>): string {
  return d.html ?? escapeHtml(d.text).replace(/\r?\n/g, '<br>')
}

/** The paragraphs of a disclaimer, cleaned for an email: plain bold, sizes within a readable range, nothing that could run. */
export function disclaimerParagraphs(html: string): string[] {
  return richToParagraphs(html).map((p) => sanitizeRich(p, undefined, { legal: true })).filter((p) => p.replace(/<[^>]*>/g, '').trim() !== '')
}

const decode = (v: string) => v.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

/** The words of a disclaimer without formatting, paragraphs separated by a blank line. */
export function disclaimerToText(html: string): string {
  return richToParagraphs(html).map((p) => decode(p.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n')
}

/**
 * The disclaimer a brief starts with: the default of the first of its regions that has one, UK first
 * (the UK module wording differs), then a global default.
 */
export function defaultDisclaimerFor(list: readonly LegalDisclaimerConfig[], regions: readonly string[]): LegalDisclaimerConfig | null {
  const ordered = [...regions].sort((a, b) => Number(b === 'UK') - Number(a === 'UK'))
  for (const region of [...ordered, 'GLOBAL']) {
    const found = list.find((d) => d.isDefault && d.region === region)
    if (found) return found
  }
  return null
}

const UNSUBSCRIBE = /unsubscribe/i

/**
 * Replaces the wording of a Disclaimer module with the chosen disclaimer. The unsubscribe line is part of
 * the module, not of the disclaimer, so it stays where it is, after the new paragraphs.
 */
export function applyDisclaimer(root: Element, html: string): void {
  const paragraphs = Array.from(root.querySelectorAll('p.disclaimer-copy'))
  if (paragraphs.length === 0) return
  const unsubscribe = paragraphs.find((p) => Array.from(p.querySelectorAll('a')).some((a) => UNSUBSCRIBE.test(a.getAttribute('href') ?? '')))
  const old = paragraphs.filter((p) => p !== unsubscribe)
  const style = old[0]?.getAttribute('style') ?? 'margin: 0 0 10px;'
  const anchor = unsubscribe ?? old[old.length - 1]
  const parent = anchor.parentNode
  if (!parent) return
  for (const text of disclaimerParagraphs(html)) {
    const p = root.ownerDocument.createElement('p')
    p.setAttribute('class', 'disclaimer-copy')
    p.setAttribute('style', style)
    p.innerHTML = text
    parent.insertBefore(p, anchor)
  }
  for (const p of old) p.parentNode?.removeChild(p)
}
