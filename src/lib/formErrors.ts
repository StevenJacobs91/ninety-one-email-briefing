import type { FieldErrors } from 'react-hook-form'
import type { BriefFormData } from './schema'

// What a person calls the field. The headline, button label and link come from the builder, not from a form field.
const NAMES: Record<string, string> = {
  'content.headline': 'Headline',
  'content.subHeadline': 'Sub-headline',
  'content.bodyIntro': 'Body introduction',
  'content.cta.label': 'Button label',
  'content.cta.url': 'Button link',
  'campaign.emailDescription': 'Email description',
  'campaign.subjectLine': 'Subject line',
  'campaign.previewText': 'Preview text',
  'deadlines.notes': 'Notes',
  'deadlines.sendDate': 'Send date',
  'assets.heroImageUrl': 'Background image address',
  'assets.heroImageAlt': 'Background image alt text',
}

export interface FormProblem {
  /** The name a person would recognise, such as "Button label" */
  field: string
  message: string
  /** The field's path in the brief, such as "content.cta.label", so a problem can be jumped to */
  path: string
}

const nameOf = (path: string[]) => NAMES[path.join('.')] ?? path.map((p) => (/^\d+$/.test(p) ? String(Number(p) + 1) : p)).join(' › ')

/** The problems a schema check found, one for each field, in the order found. */
export function describeIssues(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FormProblem[] {
  const seen = new Set<string>()
  const problems: FormProblem[] = []
  for (const issue of issues) {
    const path = issue.path.map(String)
    const key = path.join('.')
    if (seen.has(key)) continue
    seen.add(key)
    problems.push({ field: nameOf(path), message: issue.message || 'Not valid', path: key })
  }
  return problems
}

/** Every failing field in the form, with its message, so a stalled "Continue" can say what to fix. */
export function describeFormErrors(errors: FieldErrors<BriefFormData>): FormProblem[] {
  const problems: FormProblem[] = []
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== 'object') return
    const entry = node as Record<string, unknown>
    // A leaf error has a message or a type; anything else is a group of fields or a list.
    if ('message' in entry || 'type' in entry) {
      problems.push({
        field: nameOf(path),
        message: typeof entry.message === 'string' && entry.message ? entry.message : 'Not valid',
        path: path.join('.'),
      })
      return
    }
    for (const [key, child] of Object.entries(entry)) walk(child, [...path, key])
  }
  walk(errors, [])
  return problems
}
