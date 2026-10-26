import type { BriefSectionId } from './briefSections'
import { REQUIRABLE_FIELDS } from './briefRequirements'

/** The sections the team can reorder, in their built-in order. The email builder is not one of them. */
export const MOVABLE_SECTIONS: readonly BriefSectionId[] = ['identity', 'envelope', 'sender', 'targeting', 'audience', 'deadlines', 'materials', 'tags']

/** The saved order, repaired: unknown and repeated entries dropped, and any section the saved list lacks added at the end. */
export function resolveSectionOrder(saved: readonly string[] | undefined): BriefSectionId[] {
  const seen = new Set<BriefSectionId>()
  for (const id of saved ?? []) {
    if ((MOVABLE_SECTIONS as readonly string[]).includes(id)) seen.add(id as BriefSectionId)
  }
  for (const id of MOVABLE_SECTIONS) seen.add(id)
  return [...seen]
}

/** One place up (-1) or down (1), for a section or for a field within its section. At either end the same order comes back. */
export function moveSection<T extends string>(order: readonly T[], id: T, direction: -1 | 1): T[] {
  const from = order.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= order.length) return [...order]
  const next = [...order]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/** Each section's position on the page (1, 2, 3 …), with the email builder after all of them. */
export function sectionOrderMap(order: readonly BriefSectionId[]): Record<BriefSectionId, number> {
  const map = { email: order.length + 1 } as Record<BriefSectionId, number>
  order.forEach((id, i) => { map[id] = i + 1 })
  return map
}

/** A section's fields in the saved order. Repaired: fields from other sections, unknown and repeated ones dropped, missing ones added at the end. */
export function resolveFieldOrder(section: BriefSectionId, saved: Record<string, string[]> | undefined): string[] {
  const own = (REQUIRABLE_FIELDS[section] ?? []).map((f) => f.path)
  const seen = new Set<string>()
  for (const path of saved?.[section] ?? []) if (own.includes(path)) seen.add(path)
  for (const path of own) seen.add(path)
  return [...seen]
}

/** Each field's position within its section (1, 2, 3 …), for the page to order the section by. */
export function fieldPositions(saved: Record<string, string[]> | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const section of Object.keys(REQUIRABLE_FIELDS) as BriefSectionId[]) {
    resolveFieldOrder(section, saved).forEach((path, i) => { out[path] = i + 1 })
  }
  return out
}

/** The fields switched off in Settings: the saved ones that still exist. */
export function resolveHidden(saved: readonly string[] | undefined): Set<string> {
  const known = new Set(Object.values(REQUIRABLE_FIELDS).flat().map((f) => f.path))
  return new Set((saved ?? []).filter((path) => known.has(path)))
}
