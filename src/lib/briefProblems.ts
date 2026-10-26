import { briefSchema, type BriefFormData } from './schema'
import { describeIssues, type FormProblem } from './formErrors'
import { applyRequirements, type RequiredMap } from './briefRequirements'

/**
 * Everything that stops a brief going to review: each failing field in the whole brief, or an empty list. Read from the
 * schema itself, so it never depends on which fields the form has shown or touched, and a problem is never left unsaid.
 * `required` is the team's required/optional choices from Settings; without it the schema's own rules stand.
 */
export function briefProblems(values: BriefFormData, required?: RequiredMap, hidden?: ReadonlySet<string>): FormProblem[] {
  const result = briefSchema.safeParse(values)
  const issues = result.success ? [] : result.error.issues
  // The sender type's rules apply even with no team choices, so every caller gets the same answer.
  return describeIssues(applyRequirements(issues, values, required ?? {}, hidden))
}
