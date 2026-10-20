import type { EmailBuild } from './build'
import type { ThemeCatalogue } from './catalogue'
import { describeModule } from './describe'
import type { ParseDoc } from './regions'

/**
 * The legacy brief still carries a single CTA for Pardot, Power Automate and
 * Brand Review. It now comes from the first button the user actually edited;
 * a button left at its library placeholder text is not a CTA.
 */
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
