import type { EmailBuild } from './build'
import type { ThemeCatalogue } from './catalogue'
import { describeModule } from './describe'
import type { ParseDoc } from './regions'

/**
 * The legacy brief still carries a single CTA for Pardot, Power Automate and
 * Brand Review. It now comes from the first button the user actually edited;
 * a button left at its library placeholder text is not a CTA.
 */
/**
 * The label of every button the user has edited, in the order they appear in the email. Brand Review checks each of
 * them, where the brief's single CTA is only the first.
 */
export function deriveButtonLabels(build: EmailBuild, cat: ThemeCatalogue, parse: ParseDoc): string[] {
  const labels: string[] = []
  for (const m of build.modules) {
    const html = cat.modules[m.moduleName]
    if (html === undefined) continue
    for (const f of describeModule(m.moduleName, html, parse, m.repeats).fields) {
      const label = f.kind === 'button' ? m.regions[f.key]?.value?.trim() : ''
      if (label) labels.push(label)
    }
  }
  return labels
}

export function deriveCta(build: EmailBuild, cat: ThemeCatalogue, parse: ParseDoc): { label: string; url: string } | null {
  for (const m of build.modules) {
    const html = cat.modules[m.moduleName]
    if (html === undefined) continue
    const button = describeModule(m.moduleName, html, parse, m.repeats).fields.find((f) => {
      if (f.kind !== 'button') return false
      return !!m.regions[f.key]?.value?.trim()
    })
    if (!button) continue
    const saved = m.regions[button.key]
    return { label: saved.value!.trim(), url: saved.href ?? '' }
  }
  return null
}
