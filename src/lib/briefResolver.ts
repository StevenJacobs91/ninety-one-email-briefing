import type { FieldErrors, Resolver } from 'react-hook-form'
import { briefSchema, type BriefFormData } from './schema'
import { applyRequirements, type RequiredMap } from './briefRequirements'

type ErrorNode = { [key: string]: ErrorNode } & { message?: string; type?: string }

/** The brief's schema, with the team's required/optional choices applied, as the form's validator. */
export function briefResolver(getRequired: () => RequiredMap, getHidden?: () => ReadonlySet<string>): Resolver<BriefFormData> {
  return async (values) => {
    const parsed = briefSchema.safeParse(values)
    const issues = applyRequirements(parsed.success ? [] : parsed.error.issues, values, getRequired(), getHidden?.())
    if (issues.length === 0) return { values: parsed.success ? parsed.data : (values as BriefFormData), errors: {} }

    const errors: ErrorNode = {}
    for (const issue of issues) {
      let node = errors
      issue.path.forEach((key, i) => {
        const k = String(key)
        if (i === issue.path.length - 1) {
          if (!node[k]) node[k] = { message: issue.message, type: issue.code } as ErrorNode
        } else {
          node = (node[k] ??= {} as ErrorNode)
        }
      })
    }
    return { values: {}, errors: errors as unknown as FieldErrors<BriefFormData> }
  }
}
