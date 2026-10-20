import type { MergeTagSyntax } from '../adapters/MergeTagSyntax'
import type { SampleContactProvider } from '../adapters/SampleContactProvider'

export interface ParsedTag {
  raw: string
  field: string
  known: boolean
  start: number
  end: number
  /** Where this tag's output sits in the rendered text (a sample value, or the tag as written if unknown) */
  renderedStart: number
  renderedEnd: number
}

export interface MergeTagRender {
  /** The subject as a recipient sees it, with known tags replaced by sample values */
  rendered: string
  tags: ParsedTag[]
  /** Fragments that look like personalisation but are not valid tags: {{ }}, a stray {{ or }}, or [Name] */
  broken: string[]
}

// Build a fresh global copy so the adapter's own RegExp objects are never advanced.
function freshGlobal(re: RegExp): RegExp {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  return new RegExp(re.source, flags)
}

export function renderMergeTags(raw: string, syntax: MergeTagSyntax, sample: SampleContactProvider): MergeTagRender {
  const tags: ParsedTag[] = []
  let rendered = ''
  let remainder = ''
  let cursor = 0

  for (const m of raw.matchAll(freshGlobal(syntax.pattern))) {
    const start = m.index ?? 0
    const end = start + m[0].length
    const field = m[1] ?? ''
    const known = syntax.isKnownField(field)
    const value = known ? sample.getSampleValue(field) : ''
    rendered += raw.slice(cursor, start)
    const output = value || m[0]
    tags.push({ raw: m[0], field, known, start, end, renderedStart: rendered.length, renderedEnd: rendered.length + output.length })
    rendered += output
    remainder += `${raw.slice(cursor, start)} `
    cursor = end
  }
  rendered += raw.slice(cursor)
  remainder += raw.slice(cursor)

  const broken: string[] = []
  for (const m of remainder.matchAll(/\{\{[^}]*\}\}|\{\{[^}]*|\}\}/g)) broken.push(m[0].trim())
  for (const pattern of syntax.placeholderPatterns) {
    for (const m of raw.matchAll(freshGlobal(pattern))) broken.push(m[0])
  }
  return { rendered, tags, broken }
}
