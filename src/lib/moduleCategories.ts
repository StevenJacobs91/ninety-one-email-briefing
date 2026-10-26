import type { AppSettings, ModuleCategoryConfig } from '../types/settings.types'

// One list of categories, used by Settings → Email Modules and by the Add module picker. The id is what a module
// is filed under and never changes; the label is what people see and can rename in Settings.
export const DEFAULT_MODULE_CATEGORIES: ModuleCategoryConfig[] = [
  { id: 'Headers', label: 'Headers' },
  { id: 'Content', label: 'Content' },
  { id: 'Calls to action', label: 'Calls to action' },
  { id: 'Events', label: 'Events' },
  { id: 'People', label: 'People' },
  { id: 'Articles', label: 'Articles' },
  { id: 'Media', label: 'Media' },
  { id: 'Navigation', label: 'Navigation' },
  { id: 'Legal', label: 'Legal' },
  { id: 'Footers', label: 'Footers' },
  { id: 'Other', label: 'Other' },
]

/** Where a module goes when its category has been deleted or never existed. It cannot be deleted. */
export const FALLBACK_CATEGORY = 'Other'

// Names used before the lists were joined up.
const LEGACY: Record<string, string> = { CTAs: 'Calls to action', Speakers: 'People' }

export function normaliseCategoryId(id: string): string {
  return LEGACY[id] ?? id
}

/** The categories in Settings, in their order, always ending up with the fallback in the list. */
export function moduleCategories(settings: Pick<AppSettings, 'moduleCategories'>): ModuleCategoryConfig[] {
  const list = settings.moduleCategories?.length ? settings.moduleCategories : DEFAULT_MODULE_CATEGORIES
  return list.some((c) => c.id === FALLBACK_CATEGORY) ? list : [...list, { id: FALLBACK_CATEGORY, label: FALLBACK_CATEGORY }]
}

/** The category a module is filed under: its own if the list has it, else the fallback. */
export function resolveCategory(list: readonly ModuleCategoryConfig[], id: string | undefined): string {
  const normal = normaliseCategoryId(id ?? '')
  return list.some((c) => c.id === normal) ? normal : FALLBACK_CATEGORY
}

export function categoryLabel(list: readonly ModuleCategoryConfig[], id: string): string {
  return list.find((c) => c.id === id)?.label ?? id
}

/** An id for a category added in Settings: its label, made unique among the ids already in use. */
export function newCategoryId(list: readonly ModuleCategoryConfig[], label: string): string {
  const base = label.trim()
  let id = base
  for (let n = 2; list.some((c) => c.id.toLowerCase() === id.toLowerCase()); n++) id = `${base} ${n}`
  return id
}
