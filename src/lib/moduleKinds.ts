import { DEFAULT_MODULE_CATEGORIES } from './moduleCategories'

// The group of a module is the id of one of the categories in Settings (see moduleCategories.ts), so people can add and rename them.
export type PickerGroup = string
/** The categories as shipped, in order; Settings can add to, rename, reorder and remove them. */
export const PICKER_GROUPS: readonly PickerGroup[] = DEFAULT_MODULE_CATEGORIES.map((c) => c.id)

export type ModuleKind =
  | 'text' | 'numbered' | 'buttons' | 'podcast' | 'video' | 'gallery'
  | 'event' | 'table' | 'people' | 'list' | 'tabs' | 'legal' | 'generic'
  | 'columns2' | 'columns3' | 'imageLeft' | 'imageRight' | 'hero' | 'quote'

/** The layout icons someone can pick for a module they add in Settings, in the order they are offered. */
export const LAYOUT_ICONS: { kind: ModuleKind; label: string }[] = [
  { kind: 'text', label: 'Text' },
  { kind: 'columns2', label: '2 columns' },
  { kind: 'columns3', label: '3 columns' },
  { kind: 'imageLeft', label: 'Image left' },
  { kind: 'imageRight', label: 'Image right' },
  { kind: 'hero', label: 'Image above text' },
  { kind: 'gallery', label: 'Image grid' },
  { kind: 'list', label: 'List' },
  { kind: 'numbered', label: 'Numbered' },
  { kind: 'quote', label: 'Quote' },
  { kind: 'buttons', label: 'Button' },
  { kind: 'event', label: 'Event' },
  { kind: 'people', label: 'People' },
  { kind: 'video', label: 'Video' },
  { kind: 'podcast', label: 'Podcast' },
  { kind: 'table', label: 'Table' },
  { kind: 'tabs', label: 'Tabs' },
  { kind: 'legal', label: 'Legal' },
  { kind: 'generic', label: 'Other' },
]

export function isLayoutIcon(value: unknown): value is ModuleKind {
  return LAYOUT_ICONS.some((i) => i.kind === value)
}

export interface PickerModuleInfo {
  group: PickerGroup
  kind: ModuleKind
  /** Number of buttons drawn for the 'buttons' kind; 0 otherwise */
  buttons: number
  blurb: string
}

const RULES: { test: RegExp; group: PickerGroup; kind: ModuleKind; blurb: string }[] = [
  { test: /^(small header|plain logo header|header with image|visually hidden)/i, group: 'Headers', kind: 'generic', blurb: '' },
  { test: /^footer/i, group: 'Footers', kind: 'generic', blurb: '' },
  { test: /^event registration/i, group: 'Events', kind: 'event', blurb: 'Event details and registration' },
  { test: /^itinerary/i, group: 'Events', kind: 'table', blurb: 'Timed agenda table' },
  { test: /speaker/i, group: 'People', kind: 'people', blurb: 'Speaker photos and bios' },
  { test: /author/i, group: 'People', kind: 'people', blurb: 'Author photos and bios' },
  { test: /\bPM\b/, group: 'People', kind: 'people', blurb: 'Portfolio manager profiles' },
  { test: /^article list/i, group: 'Articles', kind: 'list', blurb: 'Linked article summaries' },
  { test: /^gallery/i, group: 'Media', kind: 'gallery', blurb: 'Grid of images' },
  { test: /^podcast/i, group: 'Media', kind: 'podcast', blurb: 'Cover, title and listen link' },
  { test: /^video/i, group: 'Media', kind: 'video', blurb: 'Image with a play button' },
  { test: /tabs/i, group: 'Navigation', kind: 'tabs', blurb: 'Tabs that jump to sections' },
  { test: /^(risk warning|disclaimer)/i, group: 'Legal', kind: 'legal', blurb: 'Regulatory wording' },
  { test: /cta/i, group: 'Calls to action', kind: 'buttons', blurb: '' },
  { test: /^numbered section/i, group: 'Content', kind: 'numbered', blurb: 'Numbered heading and text' },
  { test: /^(body|inner)/i, group: 'Content', kind: 'text', blurb: 'Headings and text' },
  { test: /^greeting/i, group: 'Content', kind: 'text', blurb: 'Opening greeting' },
]

function buttonCount(name: string): number {
  const multi = name.match(/(\d)x\b/gi)
  if (multi && /cta/i.test(name)) return multi.reduce((n, m) => n + parseInt(m, 10), 0)
  if (/dual|and secondary/i.test(name)) return 2
  return 1
}

export function describePickerModule(name: string, fallbackGroup: PickerGroup = 'Other', icon?: ModuleKind): PickerModuleInfo {
  const named = describeByName(name, fallbackGroup)
  // An icon chosen in Settings replaces the one the name suggests; where it is the button icon, one button is drawn unless the name says more.
  return icon ? { ...named, kind: icon, buttons: icon === 'buttons' ? Math.max(named.buttons, 1) : 0 } : named
}

function describeByName(name: string, fallbackGroup: PickerGroup): PickerModuleInfo {
  const rule = RULES.find((r) => r.test.test(name))
  if (!rule) return { group: fallbackGroup, kind: 'generic', buttons: 0, blurb: '' }
  if (rule.kind !== 'buttons') return { group: rule.group, kind: rule.kind, buttons: 0, blurb: rule.blurb }
  const buttons = buttonCount(name)
  return { group: rule.group, kind: 'buttons', buttons, blurb: buttons === 1 ? 'One button' : `${buttons} buttons` }
}

/**
 * Splits names into the picker's groups, in group order, keeping library order inside each group.
 * `assigned` is a module's category as filed in Settings, which wins over the group its name suggests; a module whose
 * group is not in `order` (a category since deleted) goes to Other.
 */
export function groupPickerModules(
  names: readonly string[],
  groups: Readonly<Record<string, PickerGroup>> = {},
  order: readonly string[] = PICKER_GROUPS,
  assigned: Readonly<Record<string, PickerGroup>> = {},
): { group: PickerGroup; names: string[] }[] {
  const groupOf = (n: string) => {
    const g = assigned[n] ?? describePickerModule(n, groups[n]).group
    return order.includes(g) ? g : 'Other'
  }
  return order
    .map((group) => ({ group, names: names.filter((n) => groupOf(n) === group) }))
    .filter((g) => g.names.length > 0)
}
