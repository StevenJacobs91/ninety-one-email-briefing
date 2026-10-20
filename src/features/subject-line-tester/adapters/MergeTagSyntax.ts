export interface MergeTagSyntax {
  /** Matches one merge tag; capture group 1 is the field name, e.g. /\{\{\s*([\w.]+)\s*\}\}/g */
  pattern: RegExp
  isKnownField(field: string): boolean
  /** Unresolved placeholders that were never real tags, e.g. [Name] */
  placeholderPatterns: RegExp[]
}
