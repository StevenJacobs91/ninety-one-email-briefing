export const PICKER_GROUPS = ['Content', 'Media', 'Calls to action', 'Events', 'People', 'Articles', 'Navigation', 'Legal', 'Other'] as const
export type PickerGroup = typeof PICKER_GROUPS[number]

export type ModuleKind =
  | 'text' | 'numbered' | 'buttons' | 'podcast' | 'video' | 'gallery'
  | 'event' | 'table' | 'people' | 'list' | 'tabs' | 'legal' | 'generic'

export interface PickerModuleInfo {
  group: PickerGroup
  kind: ModuleKind
  /** Number of buttons drawn for the 'buttons' kind; 0 otherwise */
  buttons: number
  blurb: string
}

const RULES: { test: RegExp; group: PickerGroup; kind: ModuleKind; blurb: string }[] = [
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

export function describePickerModule(name: string, fallbackGroup: PickerGroup = 'Other'): PickerModuleInfo {
  const rule = RULES.find((r) => r.test.test(name))
  if (!rule) return { group: fallbackGroup, kind: 'generic', buttons: 0, blurb: '' }
  if (rule.kind !== 'buttons') return { group: rule.group, kind: rule.kind, buttons: 0, blurb: rule.blurb }
  const buttons = buttonCount(name)
  return { group: rule.group, kind: 'buttons', buttons, blurb: buttons === 1 ? 'One button' : `${buttons} buttons` }
}

/** Splits names into the picker's groups, in group order, keeping library order inside each group. */
export function groupPickerModules(names: readonly string[], groups: Readonly<Record<string, PickerGroup>> = {}): { group: PickerGroup; names: string[] }[] {
  return PICKER_GROUPS
    .map((group) => ({ group, names: names.filter((n) => describePickerModule(n, groups[n]).group === group) }))
    .filter((g) => g.names.length > 0)
}
