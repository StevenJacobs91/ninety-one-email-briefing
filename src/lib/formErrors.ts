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
  field: string
  message: string
}

/** Every failing field in the form, with its message, so a stalled "Continue" can say what to fix. */
export function describeFormErrors(errors: FieldErrors<BriefFormData>): FormProblem[] {
  const problems: FormProblem[] = []
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== 'object') return
    const entry = node as Record<string, unknown>
    // A leaf error has a message or a type; anything else is a group of fields or a list.
    if ('message' in entry || 'type' in entry) {
      const key = path.join('.')
      problems.push({
        field: NAMES[key] ?? path.map((p) => (/^\d+$/.test(p) ? String(Number(p) + 1) : p)).join(' › '),
        message: typeof entry.message === 'string' && entry.message ? entry.message : 'Not valid',
      })
      return
    }
    for (const [key, child] of Object.entries(entry)) walk(child, [...path, key])
  }
  walk(errors, [])
  return problems
}
