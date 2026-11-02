import { useRef, useState, useMemo } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { getThemeColours } from '../../lib/themeColours'
import { useSettings } from '../../contexts/SettingsContext'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { ApprovalStatusBadge } from '../approvals/ApprovalStatusBadge'
import { CardDetailDrawer } from './CardDetailDrawer'
import { ProgressBar } from './ProgressBar'
import { SendStatusBadge, STATUS_COLOURS } from './SendStatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { GROUP_OPTIONS, groupCards, type GroupField } from '../../lib/boardGrouping'
import { applyFilters, DEFAULT_FILTERS, activeFilterCount, type BoardFilters } from '../../lib/boardFilters'
import { BoardToolbar, ColumnsMenu, GroupByMenu } from './BoardToolbar'
import { sendStatus as getSendStatusFor, ageInColumn, formatBoardDate } from '../../lib/boardFormat'
import { CARD_FIELDS, fieldsForSurface, moveColumn, resolveBoardSettings, resolveListColumns, toggleListColumn } from '../../lib/boardConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField =
  | 'emailName'
  | 'emailType'
  | 'theme'
  | 'region'
  | 'channel'
  | 'column'
  | 'sendDate'
  | 'contentApprovalDate'
  | 'urgency'
  | 'submittedAt'
  | 'submittedByName'
  | 'assignee'
  | 'clientGroup'
  | 'subjectLine'
  | 'startDate'
  | 'progress'
  | 'comments'
  | 'attachments'
  | 'tags'

type SortDir = 'asc' | 'desc'

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; colour: string }> = {
  briefed:       { label: 'Briefed',      colour: 'bg-brand-primary text-[#e8e5ce]' },
  'in-progress': { label: 'In Progress',  colour: 'bg-[#221b3b] text-[#e8e5ce]' },
  distributed:   { label: 'Distributed',  colour: 'bg-[#0a3323] text-[#e8e5ce]' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCardValue(card: KanbanCard, field: SortField): string {
  switch (field) {
    case 'emailName':           return card.emailName.toLowerCase()
    case 'emailType':           return card.emailType.toLowerCase()
    case 'theme':               return card.theme.toLowerCase()
    case 'region':              return card.region.join(', ').toLowerCase()
    case 'channel':             return card.channel.join(', ').toLowerCase()
    case 'column':              return card.column
    case 'sendDate':            return card.sendDate
    case 'contentApprovalDate': return card.contentApprovalDate
    case 'urgency':             return card.urgency
    case 'submittedAt':         return card.submittedAt
    case 'submittedByName':     return (card.submittedByName ?? '').toLowerCase()
    case 'tags':                return card.tags.toLowerCase()
    case 'assignee':            return (card.assignee ?? '').toLowerCase()
    case 'clientGroup':         return card.clientGroup.join(', ').toLowerCase()
    case 'subjectLine':         return card.subjectLine.toLowerCase()
    case 'startDate':           return card.startDate ?? ''
    case 'progress':            return String(card.progress ?? 0).padStart(3, '0')
    case 'comments':            return String(card.comments?.length ?? 0).padStart(4, '0')
    case 'attachments':         return String(card.attachments?.length ?? 0).padStart(4, '0')
    default:                    return ''
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) {
    return (
      <svg className="inline ml-1 opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    )
  }
  return dir === 'asc' ? (
    <svg className="inline ml-1 text-brand-primary dark:text-brand-accent" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ) : (
    <svg className="inline ml-1 text-brand-primary dark:text-brand-accent" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

// One definition of a cell's padding and alignment, used by headings and cells alike, so a column's heading and its
// values always start at the same left edge.
const CELL = 'px-4 py-3 text-left align-middle'
// The headings stay at the top while the rows scroll under them; the name column's heading stays in the corner.
const HEAD_RULE = 'shadow-[0_1px_0_0_#e5e7eb] dark:shadow-[0_1px_0_0_#374151]'
const STICKY_TOP = `sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 ${HEAD_RULE}`
const STICKY_HEAD = `sticky left-0 top-0 z-30 bg-gray-50 dark:bg-gray-800 border-r border-brand-border-warm dark:border-gray-700 ${HEAD_RULE}`
const STICKY_CELL = 'sticky left-0 z-10 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800'

const COLUMN_ORDER_KEY = 'ni-board-list-columns'
const COLUMN_VISIBLE_KEY = 'ni-board-list-visible'
const GROUP_KEY = 'ni-board-list-group'

const NAME_WIDTH = 260
const ACTIONS_WIDTH = 150
const COLUMN_WIDTH: Record<string, number> = {
  column: 140, urgency: 110, emailType: 150, theme: 190, submittedBy: 160, assignee: 150, region: 170, channel: 180, clientGroup: 190,
  subjectLine: 260, sendDate: 140, sendStatus: 110, contentApprovalDate: 140, startDate: 130, progress: 180, approvalStatus: 120,
  tags: 150, ageInColumn: 100, attachments: 120, comments: 110, submittedAt: 140,
}

function loadGroupField(): GroupField {
  try {
    const raw = localStorage.getItem(GROUP_KEY)
    return GROUP_OPTIONS.some((o) => o.id === raw) ? (raw as GroupField) : 'none'
  } catch {
    return 'none'
  }
}

function loadColumnOrder(key: string = COLUMN_ORDER_KEY): string[] | undefined {
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : undefined
  } catch {
    return undefined
  }
}

interface BoardListViewProps {
  /** The search and filters; the board shell keeps them while you switch views. Without them the list keeps its own. */
  filters?: BoardFilters
  onFilters?: (next: BoardFilters) => void
}

export function BoardListView({ filters: sharedFilters, onFilters }: BoardListViewProps = {}) {
  const { cards, moveCard, updateCardMeta } = useKanban()
  const { profile } = useAuth()
  // Only producers and admins can change a card, as the database enforces; others see the bar but cannot click it.
  const canEditProgress = profile?.role === 'admin' || profile?.role === 'producer'
  const { settings } = useSettings()
  const { getApprovalStatusForBrief } = useApprovals()
  const columns = fieldsForSurface(resolveBoardSettings(settings.campaignPlanner), 'list')
  // Each person can drag the columns into the order they like; it is remembered in this browser.
  const [savedOrder, setSavedOrder] = useState<string[] | undefined>(() => loadColumnOrder())
  // ...and which columns to show, on top of what Settings configures.
  const [savedVisible, setSavedVisible] = useState<string[] | undefined>(() => loadColumnOrder(COLUMN_VISIBLE_KEY))
  const dragging = useRef<string | null>(null)
  const [dropOver, setDropOver] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('sendDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [ownFilters, setOwnFilters] = useState<BoardFilters>(DEFAULT_FILTERS)
  const filters = sharedFilters ?? ownFilters
  const setFilters = onFilters ?? setOwnFilters
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [groupField, setGroupField] = useState<GroupField>(() => loadGroupField())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function chooseGroup(next: GroupField) {
    setGroupField(next)
    setCollapsedGroups(new Set())
    try {
      if (next === 'none') localStorage.removeItem(GROUP_KEY)
      else localStorage.setItem(GROUP_KEY, next)
    } catch { /* the choice just is not remembered */ }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const activeCount = activeFilterCount(filters)

  // Filter + sort
  const visibleCards = useMemo(() => {
    const result = applyFilters(cards, filters)

    // Sort
    result.sort((a, b) => {
      const va = getCardValue(a, sortField)
      const vb = getCardValue(b, sortField)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [cards, filters, sortField, sortDir])

  const groups = useMemo(() => groupCards(visibleCards, groupField), [visibleCards, groupField])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Each optional column: its heading, how it sorts (if it does) and what a row shows
  const COLUMN_DEFS: Record<string, { header: string; sort?: SortField; cell: (card: KanbanCard) => React.ReactNode; nowrap?: boolean }> = {
    column: { header: 'Stage', sort: 'column', nowrap: true, cell: (c) => (
      <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${COLUMN_CONFIG[c.column].colour}`}>{COLUMN_CONFIG[c.column].label}</span>
    ) },
    urgency: { header: 'Urgency', sort: 'urgency', nowrap: true, cell: (c) => c.urgency === 'urgent'
      ? <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
      : <span className="text-[10px] text-gray-400 dark:text-gray-500">Standard</span> },
    emailType: { header: 'Type', sort: 'emailType', nowrap: true, cell: (c) => <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{c.emailType || '—'}</span> },
    theme: { header: 'Theme', sort: 'theme', cell: (c) => {
      const colours = getThemeColours(c.theme)
      return (
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} />
          <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={c.theme}>{c.theme}</span>
        </div>
      )
    } },
    submittedBy: { header: 'Submitted by', sort: 'submittedByName', cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-300 truncate block max-w-[140px]" title={c.submittedByEmail ?? ''}>{c.submittedByName ?? '—'}</span> },
    assignee: { header: 'Assignee', sort: 'assignee', cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-300 truncate block max-w-[120px]">{c.assignee || '—'}</span> },
    region: { header: 'Region', sort: 'region', cell: (c) => <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={c.region.join(', ')}>{c.region.join(' · ') || '—'}</p> },
    channel: { header: 'Channel', sort: 'channel', cell: (c) => <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={c.channel.join(', ')}>{c.channel.join(' · ') || '—'}</p> },
    clientGroup: { header: 'Client group', sort: 'clientGroup', cell: (c) => <p className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[140px]" title={c.clientGroup.join(', ')}>{c.clientGroup.join(' · ') || '—'}</p> },
    subjectLine: { header: 'Subject line', sort: 'subjectLine', cell: (c) => <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[220px]" title={c.subjectLine}>{c.subjectLine || '—'}</p> },
    sendDate: { header: 'Send date', sort: 'sendDate', nowrap: true, cell: (c) => {
      const st = getSendStatusFor(c.sendDate, new Date(), c.column)
      return <span className="text-xs font-medium text-gray-700 dark:text-gray-300" style={st === 'overdue' ? { color: STATUS_COLOURS.overdue } : undefined}>{formatBoardDate(c.sendDate)}</span>
    } },
    sendStatus: { header: 'Status', nowrap: true, cell: (c) => <SendStatusBadge sendDate={c.sendDate} column={c.column} /> },
    contentApprovalDate: { header: 'Approval date', sort: 'contentApprovalDate', nowrap: true, cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-400">{formatBoardDate(c.contentApprovalDate)}</span> },
    startDate: { header: 'Start date', sort: 'startDate', nowrap: true, cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-400">{formatBoardDate(c.startDate ?? '')}</span> },
    progress: { header: 'Progress', sort: 'progress', nowrap: true, cell: (c) => (
      <ProgressBar value={c.progress ?? 0} onChange={canEditProgress ? (progress) => updateCardMeta(c.id, { progress }) : undefined} />
    ) },
    approvalStatus: { header: 'Approval', nowrap: true, cell: (c) => {
      const a = settings.approvals?.enabled ? getApprovalStatusForBrief(c.briefId) : 'none'
      return a === 'none' ? <span className="text-gray-300 dark:text-gray-600">—</span> : <ApprovalStatusBadge status={a} size="sm" />
    } },
    tags: { header: 'Tags', sort: 'tags', cell: (c) => c.tags ? <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={c.tags}>{c.tags}</p> : <span className="text-gray-300 dark:text-gray-600">—</span> },
    ageInColumn: { header: 'In stage', nowrap: true, cell: (c) => <span className="text-xs text-gray-500 dark:text-gray-400">{ageInColumn(c)}</span> },
    attachments: { header: 'Attachments', sort: 'attachments', nowrap: true, cell: (c) => <span className="text-xs text-gray-500 dark:text-gray-400">{c.attachments?.length ?? 0}</span> },
    comments: { header: 'Comments', sort: 'comments', nowrap: true, cell: (c) => <span className="text-xs text-gray-500 dark:text-gray-400">{c.comments?.length ?? 0}</span> },
    submittedAt: { header: 'Submitted', sort: 'submittedAt', nowrap: true, cell: (c) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatBoardDate(c.submittedAt)}</span> },
  }
  const available = ['column', ...CARD_FIELDS.map((f) => f.id).filter((id) => COLUMN_DEFS[id])]
  const configured = ['column', ...columns.filter((id) => COLUMN_DEFS[id] && id !== 'column')]
  const shownColumns = resolveListColumns(available, configured, savedVisible, savedOrder)
  const customised = savedVisible !== undefined || shownColumns.some((id, i) => id !== configured[i]) || shownColumns.length !== configured.length

  function saveVisible(next: string[] | undefined) {
    setSavedVisible(next)
    try {
      if (next) localStorage.setItem(COLUMN_VISIBLE_KEY, JSON.stringify(next))
      else localStorage.removeItem(COLUMN_VISIBLE_KEY)
    } catch { /* the choice just is not remembered */ }
  }

  function toggleColumn(id: string) {
    const next = toggleListColumn(shownColumns, id, available)
    saveVisible(next)
    saveOrder(next)
  }

  function resetColumns() {
    saveVisible(undefined)
    saveOrder(undefined)
  }

  function saveOrder(next: string[] | undefined) {
    setSavedOrder(next)
    try {
      if (next) localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
      else localStorage.removeItem(COLUMN_ORDER_KEY)
    } catch { /* the order just is not remembered */ }
  }

  function shift(id: string, by: -1 | 1) {
    const target = shownColumns[shownColumns.indexOf(id) + by]
    if (target) saveOrder(moveColumn(shownColumns, id, target))
  }

  /** A column heading you can sort by clicking and move by dragging (or Alt + arrow keys). */
  // A function, not a component: re-rendering must not remount the heading mid-drag or drop its focus.
  function columnTh(id: string) {
    const def = COLUMN_DEFS[id]
    return (
      <th
        key={id}
        draggable
        tabIndex={0}
        title="Drag to move this column, or press Alt and an arrow key"
        onDragStart={(e) => { dragging.current = id; e.dataTransfer?.setData('text/plain', id) }}
        onDragOver={(e) => { if (dragging.current && dragging.current !== id) { e.preventDefault(); setDropOver(id) } }}
        onDragLeave={() => setDropOver((o) => (o === id ? null : o))}
        onDrop={(e) => {
          e.preventDefault()
          const from = dragging.current
          dragging.current = null
          setDropOver(null)
          if (from && from !== id) saveOrder(moveColumn(shownColumns, from, id))
        }}
        onDragEnd={() => { dragging.current = null; setDropOver(null) }}
        onKeyDown={(e) => {
          if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
          e.preventDefault()
          shift(id, e.key === 'ArrowLeft' ? -1 : 1)
        }}
        onClick={def.sort ? () => handleSort(def.sort!) : undefined}
        className={`${CELL} ${STICKY_TOP} text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-grab active:cursor-grabbing hover:text-brand-primary dark:hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 ${dropOver === id ? 'bg-brand-accent/20 shadow-[inset_3px_0_0_0_var(--tw-shadow-color)] shadow-brand-primary' : ''}`}
      >
        {def.header}
        {def.sort && <SortIcon field={def.sort} active={sortField} dir={sortDir} />}
      </th>
    )
  }

  function Th({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className={`${CELL} ${STICKY_HEAD} min-w-[220px] text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-brand-primary dark:hover:text-brand-accent select-none transition-colors`}
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} active={sortField} dir={sortDir} />
      </th>
    )
  }

  function renderRow(card: KanbanCard) {
    const colIndex = (['briefed', 'in-progress', 'distributed'] as KanbanColumn[]).indexOf(card.column)
    const prevCol = colIndex > 0 ? (['briefed', 'in-progress', 'distributed'] as KanbanColumn[])[colIndex - 1] : null
    const nextCol = colIndex < 2 ? (['briefed', 'in-progress', 'distributed'] as KanbanColumn[])[colIndex + 1] : null


    return (
      <tr
        key={card.id}
        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
      >
        {/* Email name */}
        <td className={`${CELL} ${STICKY_CELL} min-w-[220px] max-w-[260px]`}>
          <button
            type="button"
            onClick={() => setSelectedCard(card)}
            title={card.emailName}
            className="block max-w-full text-left font-semibold text-gray-900 dark:text-gray-100 truncate hover:text-brand-primary dark:hover:text-brand-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 rounded-sm"
          >
            {card.emailName}
          </button>
          {card.subjectLine && !shownColumns.includes('subjectLine') && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5" title={card.subjectLine}>
              {card.subjectLine}
            </p>
          )}
        </td>

        {shownColumns.map((id) => (
          <td key={id} className={`${CELL} ${COLUMN_DEFS[id].nowrap ? 'whitespace-nowrap' : ''}`}>{COLUMN_DEFS[id].cell(card)}</td>
        ))}

        {/* Actions */}
        <td className={`${CELL} whitespace-nowrap`}>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {prevCol && (
              <button
                type="button"
                onClick={() => moveCard(card.id, prevCol)}
                title={`Move to ${COLUMN_CONFIG[prevCol].label}`}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            )}
            {nextCol && (
              <button
                type="button"
                onClick={() => moveCard(card.id, nextCol)}
                title={`Move to ${COLUMN_CONFIG[nextCol].label}`}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedCard(card)}
              className="ml-1 text-[11px] font-medium text-brand-primary dark:text-brand-accent hover:underline px-1.5 py-1 transition-colors"
            >
              View
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const headRow = (
    <tr className="border-b border-brand-border-warm dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
      <Th field="emailName">Email Name</Th>
      {shownColumns.map((id) => columnTh(id))}
      <th className={`${CELL} ${STICKY_TOP} text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
        Actions
      </th>
    </tr>
  )

  // Grouped cards are separate tables, so they need fixed widths to keep their columns in line.
  const widths = [NAME_WIDTH, ...shownColumns.map((id) => COLUMN_WIDTH[id] ?? 150), ACTIONS_WIDTH]
  const tableWidth = widths.reduce((sum, w) => sum + w, 0)
  const colgroup = <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <BoardToolbar
        filters={filters}
        onFilters={setFilters}
        cards={cards}
        shown={visibleCards.length}
        trailing={customised ? (
          <button type="button" onClick={resetColumns} className="mr-3 text-xs text-brand-primary dark:text-brand-accent hover:underline">Reset columns</button>
        ) : null}
      >
        <ColumnsMenu
          items={available.map((id) => ({ id, label: COLUMN_DEFS[id].header }))}
          shown={shownColumns}
          onToggle={toggleColumn}
          onReset={customised ? resetColumns : undefined}
        />
        <GroupByMenu value={groupField} onChange={chooseGroup} />
      </BoardToolbar>

      {/* Table */}
      <div className="px-6 pb-6 w-full flex-1 min-h-0">
        {visibleCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="text-gray-300 dark:text-gray-600 mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No briefs match your filters.</p>
            {activeCount > 0 && (
              <button type="button" onClick={clearFilters} className="mt-2 text-xs text-brand-primary dark:text-brand-accent hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          groupField === 'none' ? (
            <div className="h-full bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-xl overflow-auto">
              <table className="w-full min-w-max text-sm border-collapse">
                <thead>{headRow}</thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleCards.map(renderRow)}
                </tbody>
              </table>
            </div>
          ) : (
            // Each group is its own card under a labelled tab, so one group is never mistaken for the next.
            // The tables share fixed column widths, so the columns line up from one card to the next.
            <div className="h-full overflow-auto pb-2">
              <div className="space-y-7" style={{ minWidth: tableWidth }}>
                <div className="sticky top-0 z-30 bg-gray-50 dark:bg-gray-800 border border-brand-border-warm dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="text-sm border-collapse table-fixed" style={{ width: tableWidth }}>
                    {colgroup}
                    <thead>{headRow}</thead>
                  </table>
                </div>
                {groups.map((group) => {
                  const folded = collapsedGroups.has(group.key)
                  return (
                    <section key={group.key} aria-label={`${group.label} group`}>
                      <button
                        type="button"
                        aria-expanded={!folded}
                        onClick={() => toggleGroup(group.key)}
                        className={`sticky left-0 inline-flex items-center gap-2.5 pl-4 pr-3 py-2 text-sm font-semibold bg-brand-primary text-white dark:bg-brand-primary dark:text-[#e8e5ce] hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent ${folded ? 'rounded-xl' : 'rounded-t-xl'}`}
                      >
                        <svg className={`transition-transform ${folded ? '-rotate-90' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                        {group.label}
                        <span className="bg-brand-accent text-brand-primary text-[11px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center">{group.cards.length}</span>
                      </button>
                      {!folded && (
                        <div className="bg-white dark:bg-gray-900 border-y-2 border-x-0 border-brand-primary/80 dark:border-brand-primary rounded-b-xl rounded-tr-xl shadow-sm">
                          <table className="text-sm border-collapse table-fixed" style={{ width: tableWidth }}>
                            {colgroup}
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {group.cards.map(renderRow)}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Card detail drawer */}
      {selectedCard && (
        <CardDetailDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
