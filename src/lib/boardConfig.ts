import type { CampaignPlannerSettings } from '../types/settings.types'

export const BOARD_VIEWS = ['kanban', 'list', 'timeline', 'calendar'] as const
export type BoardView = typeof BOARD_VIEWS[number]

export const BOARD_VIEW_LABEL: Record<BoardView, string> = {
  kanban: 'Board',
  list: 'List',
  timeline: 'Timeline',
  calendar: 'Calendar',
}

export const BOARD_COLUMNS = ['briefed', 'in-progress', 'distributed'] as const
export type BoardColumnId = typeof BOARD_COLUMNS[number]

export type FieldKind = 'chip' | 'cell' | 'block' | 'meta'

export interface CardFieldDef {
  id: string
  /** How the field is laid out: a badge, a labelled value, a full-width block, or small footer text */
  kind: FieldKind
  label: string
  hint: string
  defaultOn: boolean
}

/** Every optional field a task card (and a list column) can show. The card title is always shown. */
export const CARD_FIELDS: readonly CardFieldDef[] = [
  { id: 'urgency', kind: 'chip', label: 'Urgent flag', hint: 'A red "Urgent" badge on urgent briefs', defaultOn: true },
  { id: 'emailType', kind: 'chip', label: 'Email type', hint: 'Campaign, newsletter, fund update…', defaultOn: true },
  { id: 'theme', kind: 'block', label: 'Theme', hint: 'The two brand colours and theme name', defaultOn: true },
  { id: 'submittedBy', kind: 'cell', label: 'Submitted by', hint: 'Who submitted the brief', defaultOn: true },
  { id: 'assignee', kind: 'cell', label: 'Assignee', hint: 'The team member the campaign is assigned to', defaultOn: true },
  { id: 'region', kind: 'cell', label: 'Regions', hint: 'ZA, UK, EU…', defaultOn: true },
  { id: 'channel', kind: 'cell', label: 'Channels', hint: 'Intermediary, institutional, retail', defaultOn: true },
  { id: 'clientGroup', kind: 'cell', label: 'Client groups', hint: 'The client groups the email targets', defaultOn: false },
  { id: 'subjectLine', kind: 'block', label: 'Subject line', hint: 'The email subject line', defaultOn: false },
  { id: 'sendDate', kind: 'cell', label: 'Send date', hint: 'When the email goes out', defaultOn: true },
  { id: 'sendStatus', kind: 'chip', label: 'Overdue / due soon badge', hint: 'Flags campaigns past or close to their send date', defaultOn: true },
  { id: 'contentApprovalDate', kind: 'cell', label: 'Content approval date', hint: 'The date content must be approved by', defaultOn: false },
  { id: 'startDate', kind: 'cell', label: 'Start date', hint: 'When production work begins', defaultOn: false },
  { id: 'progress', kind: 'block', label: 'Progress', hint: 'A completion bar', defaultOn: true },
  { id: 'approvalStatus', kind: 'chip', label: 'Approval status', hint: 'Pending, approved or rejected (when approvals are on)', defaultOn: true },
  { id: 'tags', kind: 'cell', label: 'Tags', hint: 'The tags on the brief', defaultOn: true },
  { id: 'submittedAt', kind: 'cell', label: 'Submitted date', hint: 'When the brief was added to the board', defaultOn: false },
  { id: 'ageInColumn', kind: 'meta', label: 'Time in stage', hint: 'How long the card has been in its column', defaultOn: true },
  { id: 'comments', kind: 'meta', label: 'Comment count', hint: 'How many comments the card has', defaultOn: true },
]

const FIELD_IDS = CARD_FIELDS.map((f) => f.id)

export interface CardFieldsConfig {
  order: string[]
  hidden: string[]
}

export interface ResolvedField {
  id: string
  visible: boolean
}

export function defaultCardFields(): CardFieldsConfig {
  return {
    order: [...FIELD_IDS],
    hidden: CARD_FIELDS.filter((f) => !f.defaultOn).map((f) => f.id),
  }
}

/** The saved order (unknown ids dropped, repeats ignored), then any field added since, each with its visibility. */
export function resolveCardFields(cfg: Partial<CardFieldsConfig> | undefined): ResolvedField[] {
  const base = cfg ? { order: cfg.order ?? [], hidden: cfg.hidden ?? [] } : defaultCardFields()
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const id of [...base.order, ...FIELD_IDS]) {
    if (!FIELD_IDS.includes(id) || seen.has(id)) continue
    seen.add(id)
    ordered.push(id)
  }
  // A field added after the config was saved starts at its default visibility.
  const known = new Set(base.order)
  const hidden = new Set([
    ...base.hidden,
    ...(cfg ? CARD_FIELDS.filter((f) => !known.has(f.id) && !f.defaultOn).map((f) => f.id) : []),
  ])
  return ordered.map((id) => ({ id, visible: !hidden.has(id) }))
}

function normalise(cfg: Partial<CardFieldsConfig> | undefined): CardFieldsConfig {
  const resolved = resolveCardFields(cfg)
  return { order: resolved.map((f) => f.id), hidden: resolved.filter((f) => !f.visible).map((f) => f.id) }
}

export function toggleCardField(cfg: CardFieldsConfig, id: string): CardFieldsConfig {
  const n = normalise(cfg)
  return { order: n.order, hidden: n.hidden.includes(id) ? n.hidden.filter((h) => h !== id) : [...n.hidden, id] }
}

export function moveCardField(cfg: CardFieldsConfig, id: string, dir: -1 | 1): CardFieldsConfig {
  const n = normalise(cfg)
  const i = n.order.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= n.order.length) return n
  const order = [...n.order]
  ;[order[i], order[j]] = [order[j], order[i]]
  return { order, hidden: n.hidden }
}

export type CardDensity = 'comfortable' | 'compact'
export type CardAccent = 'none' | 'theme' | 'urgency'

export interface BoardSettings {
  enabled: boolean
  defaultView: BoardView
  enabledViews: BoardView[]
  visibleColumns: BoardColumnId[]
  allowManualCampaigns: boolean
  density: CardDensity
  accent: CardAccent
  separateListFields: boolean
  cardFields: CardFieldsConfig
  listFields: CardFieldsConfig
}

/** Fills in anything missing from what is saved, so older saved settings keep working. */
export function resolveBoardSettings(stored: Partial<CampaignPlannerSettings> | undefined): BoardSettings {
  const s = stored ?? {}
  const views = (s.enabledViews ?? []).filter((v): v is BoardView => (BOARD_VIEWS as readonly string[]).includes(v))
  const enabledViews = views.length > 0 ? BOARD_VIEWS.filter((v) => views.includes(v)) : [...BOARD_VIEWS]
  const defaultView = s.defaultView && enabledViews.includes(s.defaultView) ? s.defaultView : enabledViews[0]
  const columns = (s.visibleColumns ?? []).filter((c): c is BoardColumnId => (BOARD_COLUMNS as readonly string[]).includes(c))

  // The old Show Assignee / Show Progress switches apply until card fields have been saved.
  let cardFields = normalise(s.cardFields)
  if (!s.cardFields) {
    const hide = [...(s.showAssignee === false ? ['assignee'] : []), ...(s.showProgress === false ? ['progress'] : [])]
    cardFields = { order: cardFields.order, hidden: [...new Set([...cardFields.hidden, ...hide])] }
  }

  return {
    enabled: s.enabled !== false,
    defaultView,
    enabledViews,
    visibleColumns: columns.length > 0 ? BOARD_COLUMNS.filter((c) => columns.includes(c)) : [...BOARD_COLUMNS],
    allowManualCampaigns: s.allowManualCampaigns !== false,
    density: s.density === 'compact' ? 'compact' : 'comfortable',
    accent: s.accent === 'theme' || s.accent === 'urgency' ? s.accent : 'none',
    separateListFields: s.separateListFields === true,
    cardFields,
    listFields: normalise(s.listFields),
  }
}

/** The visible field ids, in order, for a task card or for the list's columns. */
export function fieldsForSurface(settings: BoardSettings, surface: 'card' | 'list'): string[] {
  const cfg = surface === 'list' && settings.separateListFields ? settings.listFields : settings.cardFields
  return resolveCardFields(cfg).filter((f) => f.visible).map((f) => f.id)
}

/** Groups neighbouring fields of the same kind so they sit on one row of the card. */
export function groupFields(ids: readonly string[]): { kind: FieldKind; ids: string[] }[] {
  const groups: { kind: FieldKind; ids: string[] }[] = []
  for (const id of ids) {
    const kind = CARD_FIELDS.find((f) => f.id === id)?.kind
    if (!kind) continue
    const last = groups[groups.length - 1]
    if (last && last.kind === kind) last.ids.push(id)
    else groups.push({ kind, ids: [id] })
  }
  return groups
}
