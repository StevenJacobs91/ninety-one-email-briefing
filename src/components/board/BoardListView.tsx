import { useRef, useState, useMemo } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { getThemeColours } from '../../lib/themeColours'
import { useSettings } from '../../contexts/SettingsContext'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { ApprovalStatusBadge } from '../approvals/ApprovalStatusBadge'
import { CardDetailDrawer } from './CardDetailDrawer'
import { sendStatus as getSendStatusFor, ageInColumn, formatBoardDate } from '../../lib/boardFormat'
import { applyColumnOrder, fieldsForSurface, moveColumn, resolveBoardSettings } from '../../lib/boardConfig'

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

interface Filters {
  search: string
  emailType: string
  theme: string
  region: string
  channel: string
  column: string
  urgency: string
  sendStatus: string   // 'overdue' | 'due-soon' | 'ok' | ''
  tags: string
  sendDateFrom: string
  sendDateTo: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; colour: string }> = {
  briefed:       { label: 'Briefed',      colour: 'bg-brand-primary text-[#e8e5ce]' },
  'in-progress': { label: 'In Progress',  colour: 'bg-[#221b3b] text-[#e8e5ce]' },
  distributed:   { label: 'Distributed',  colour: 'bg-[#0a3323] text-[#e8e5ce]' },
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  emailType: '',
  theme: '',
  region: '',
  channel: '',
  column: '',
  urgency: '',
  sendStatus: '',
  tags: '',
  sendDateFrom: '',
  sendDateTo: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSendStatus(sendDate: string): 'overdue' | 'due-soon' | 'ok' {
  if (!sendDate) return 'ok'
  const today = new Date()
  const diff = Math.ceil((new Date(sendDate).getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'due-soon'
  return 'ok'
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort()
}

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

function SendStatusBadge({ sendDate, column }: { sendDate: string; column?: string }) {
  const status = getSendStatusFor(sendDate, new Date(), column)
  if (status === 'overdue')
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium whitespace-nowrap">Overdue</span>
  if (status === 'due-soon')
    return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium whitespace-nowrap">Due soon</span>
  return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
}

// ─── Main component ───────────────────────────────────────────────────────────

const COLUMN_ORDER_KEY = 'ni-board-list-columns'

function loadColumnOrder(): string[] | undefined {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : undefined
  } catch {
    return undefined
  }
}

export function BoardListView() {
  const { cards, moveCard } = useKanban()
  const { settings } = useSettings()
  const { getApprovalStatusForBrief } = useApprovals()
  const columns = fieldsForSurface(resolveBoardSettings(settings.campaignPlanner), 'list')
  // Each person can drag the columns into the order they like; it is remembered in this browser.
  const [savedOrder, setSavedOrder] = useState<string[] | undefined>(loadColumnOrder)
  const dragging = useRef<string | null>(null)
  const [dropOver, setDropOver] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('sendDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)

  // Collect all unique values for dropdown filters
  const allEmailTypes = useMemo(() => unique(cards.map((c) => c.emailType)), [cards])
  const allThemes     = useMemo(() => unique(cards.map((c) => c.theme)), [cards])
  const allRegions    = useMemo(() => unique(cards.flatMap((c) => c.region)), [cards])
  const allChannels   = useMemo(() => unique(cards.flatMap((c) => c.channel)), [cards])

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v !== '').length

  // Filter + sort
  const visibleCards = useMemo(() => {
    let result = [...cards]

    // Text search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.emailName.toLowerCase().includes(q) ||
          c.subjectLine.toLowerCase().includes(q) ||
          c.emailType.toLowerCase().includes(q) ||
          c.region.some((r) => r.toLowerCase().includes(q)) ||
          c.channel.some((ch) => ch.toLowerCase().includes(q)) ||
          c.clientGroup.some((g) => g.toLowerCase().includes(q)) ||
          c.tags.toLowerCase().includes(q) ||
          c.theme.toLowerCase().includes(q) ||
          (c.submittedByName ?? '').toLowerCase().includes(q) ||
          (c.submittedByEmail ?? '').toLowerCase().includes(q)
      )
    }

    // Dropdown filters
    if (filters.emailType) result = result.filter((c) => c.emailType === filters.emailType)
    if (filters.theme)     result = result.filter((c) => c.theme === filters.theme)
    if (filters.region)    result = result.filter((c) => c.region.includes(filters.region))
    if (filters.channel)   result = result.filter((c) => c.channel.includes(filters.channel))
    if (filters.column)    result = result.filter((c) => c.column === filters.column)
    if (filters.urgency)   result = result.filter((c) => c.urgency === filters.urgency)
    if (filters.tags)      result = result.filter((c) => c.tags.toLowerCase().includes(filters.tags.toLowerCase()))

    // Send status filter
    if (filters.sendStatus) result = result.filter((c) => getSendStatus(c.sendDate) === filters.sendStatus)

    // Date range
    if (filters.sendDateFrom) result = result.filter((c) => c.sendDate >= filters.sendDateFrom)
    if (filters.sendDateTo)   result = result.filter((c) => c.sendDate <= filters.sendDateTo)

    // Sort
    result.sort((a, b) => {
      const va = getCardValue(a, sortField)
      const vb = getCardValue(b, sortField)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [cards, filters, sortField, sortDir])

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
      return <span className={`text-xs font-medium ${st === 'overdue' ? 'text-red-600 dark:text-red-400' : st === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatBoardDate(c.sendDate)}</span>
    } },
    sendStatus: { header: 'Status', nowrap: true, cell: (c) => <SendStatusBadge sendDate={c.sendDate} column={c.column} /> },
    contentApprovalDate: { header: 'Approval date', sort: 'contentApprovalDate', nowrap: true, cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-400">{formatBoardDate(c.contentApprovalDate)}</span> },
    startDate: { header: 'Start date', sort: 'startDate', nowrap: true, cell: (c) => <span className="text-xs text-gray-600 dark:text-gray-400">{formatBoardDate(c.startDate ?? '')}</span> },
    progress: { header: 'Progress', sort: 'progress', nowrap: true, cell: (c) => (
      <div className="flex items-center gap-2 min-w-[90px]">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1"><div className="h-1 rounded-full bg-brand-primary dark:bg-brand-accent" style={{ width: `${c.progress ?? 0}%` }} /></div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">{c.progress ?? 0}%</span>
      </div>
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
  const configured = ['column', ...columns.filter((id) => COLUMN_DEFS[id] && id !== 'column')]
  const shownColumns = applyColumnOrder(configured, savedOrder)
  const customOrder = shownColumns.some((id, i) => id !== configured[i])

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
        className={`px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none transition-colors cursor-grab active:cursor-grabbing hover:text-brand-primary dark:hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 ${dropOver === id ? 'bg-brand-accent/20 shadow-[inset_3px_0_0_0_var(--tw-shadow-color)] shadow-brand-primary' : ''}`}
      >
        {def.header}
        {def.sort && <SortIcon field={def.sort} active={sortField} dir={sortDir} />}
      </th>
    )
  }

  function Th({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <th
        className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-brand-primary dark:hover:text-brand-accent select-none transition-colors"
        onClick={() => handleSort(field)}
      >
        {children}
        <SortIcon field={field} active={sortField} dir={sortDir} />
      </th>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      {/* Toolbar */}
      <div className="px-6 py-4 w-full">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search all fields..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
            />
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white dark:bg-gray-900 border-brand-border-warm dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-brand-accent text-brand-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}

          {/* Result count */}
          <p className="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {customOrder && (
              <button type="button" onClick={() => saveOrder(undefined)} className="mr-3 text-xs text-brand-primary dark:text-brand-accent hover:underline">Reset column order</button>
            )}
            {visibleCards.length} of {cards.length} brief{cards.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mt-3 bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

            {/* Status */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Stage</label>
              <select value={filters.column} onChange={(e) => setFilter('column', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All stages</option>
                {(['briefed', 'in-progress', 'distributed'] as KanbanColumn[]).map((c) => (
                  <option key={c} value={c}>{COLUMN_CONFIG[c].label}</option>
                ))}
              </select>
            </div>

            {/* Email type */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Email Type</label>
              <select value={filters.emailType} onChange={(e) => setFilter('emailType', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All types</option>
                {allEmailTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Theme</label>
              <select value={filters.theme} onChange={(e) => setFilter('theme', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All themes</option>
                {allThemes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Region</label>
              <select value={filters.region} onChange={(e) => setFilter('region', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All regions</option>
                {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Channel</label>
              <select value={filters.channel} onChange={(e) => setFilter('channel', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All channels</option>
                {allChannels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Urgency</label>
              <select value={filters.urgency} onChange={(e) => setFilter('urgency', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All</option>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Send status */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Send Status</label>
              <select value={filters.sendStatus} onChange={(e) => setFilter('sendStatus', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30">
                <option value="">All</option>
                <option value="overdue">Overdue</option>
                <option value="due-soon">Due soon</option>
                <option value="ok">On track</option>
              </select>
            </div>

            {/* Send date from */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Send Date From</label>
              <input type="date" value={filters.sendDateFrom} onChange={(e) => setFilter('sendDateFrom', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>

            {/* Send date to */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Send Date To</label>
              <input type="date" value={filters.sendDateTo} onChange={(e) => setFilter('sendDateTo', e.target.value)}
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Tags</label>
              <input type="text" value={filters.tags} onChange={(e) => setFilter('tags', e.target.value)}
                placeholder="Filter by tag..."
                className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="px-6 pb-8 overflow-x-auto w-full">
        {visibleCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="text-gray-300 dark:text-gray-600 mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">No briefs match your filters.</p>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="mt-2 text-xs text-brand-primary dark:text-brand-accent hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-brand-border-warm dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60">
                  <Th field="emailName">Email Name</Th>
                  {shownColumns.map((id) => columnTh(id))}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleCards.map((card) => {
                  const colIndex = (['briefed', 'in-progress', 'distributed'] as KanbanColumn[]).indexOf(card.column)
                  const prevCol = colIndex > 0 ? (['briefed', 'in-progress', 'distributed'] as KanbanColumn[])[colIndex - 1] : null
                  const nextCol = colIndex < 2 ? (['briefed', 'in-progress', 'distributed'] as KanbanColumn[])[colIndex + 1] : null

                  return (
                    <tr
                      key={card.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      {/* Email name */}
                      <td className="px-3 py-3 max-w-[200px]">
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
                        <td key={id} className={`px-3 py-3 ${COLUMN_DEFS[id].nowrap ? 'whitespace-nowrap' : ''}`}>{COLUMN_DEFS[id].cell(card)}</td>
                      ))}

                      {/* Actions */}
                      <td className="px-3 py-3 whitespace-nowrap">
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Card detail drawer */}
      {selectedCard && (
        <CardDetailDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}
