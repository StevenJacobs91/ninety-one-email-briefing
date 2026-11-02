import { useEffect, useMemo, useRef, useState } from 'react'
import type { KanbanCard } from '../../types/kanban.types'
import { activeFilterCount, DEFAULT_FILTERS, type BoardFilters } from '../../lib/boardFilters'
import { GROUP_OPTIONS, type GroupField } from '../../lib/boardGrouping'

const STAGES: { id: string; label: string }[] = [
  { id: 'briefed', label: 'Briefed' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'distributed', label: 'Distributed' },
]

const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort()

const BUTTON_ON = 'bg-brand-primary text-white border-brand-primary'
const BUTTON_OFF = 'bg-white dark:bg-gray-900 border-brand-border-warm dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'
const FIELD = 'w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/30'
const LABEL = 'block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5'

/** A dropdown that closes on Escape or a click elsewhere. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // Escape closes the menu only: marking it handled stops the board behind from closing too.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close() } }
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [open, close])
  return ref
}

interface ColumnsMenuProps {
  /** What the button and the menu are called: "Columns" in the list, "Fields" for the cards on the board */
  label?: string
  menuTitle?: string
  items: { id: string; label: string }[]
  shown: string[]
  onToggle: (id: string) => void
  /** Offered when the person's choice differs from what Settings configures */
  onReset?: () => void
}

/** A picker for which columns (or card fields) to show. */
export function ColumnsMenu({ label = 'Columns', menuTitle = 'Show columns', items, shown, onToggle, onReset }: ColumnsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${open ? BUTTON_ON : BUTTON_OFF}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><rect x="17" y="4" width="4" height="16" rx="1" />
        </svg>
        {label}
      </button>
      {open && (
        <div role="group" aria-label={menuTitle} className="absolute left-0 top-full mt-2 z-50 w-64 max-h-80 overflow-y-auto rounded-lg border border-brand-border-warm dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-2">
          <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-gray-400">{menuTitle}</p>
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" className="w-4 h-4 accent-brand-primary" checked={shown.includes(item.id)} onChange={() => onToggle(item.id)} />
              {item.label}
            </label>
          ))}
          {onReset && (
            <button type="button" onClick={onReset} className="mt-1 w-full text-left px-2 py-1.5 text-xs text-brand-primary dark:text-brand-accent hover:underline">Reset to configured {label.toLowerCase()}</button>
          )}
        </div>
      )}
    </div>
  )
}

/** Picks what to group the cards by. */
export function GroupByMenu({ value, onChange }: { value: GroupField; onChange: (next: GroupField) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${open || value !== 'none' ? BUTTON_ON : BUTTON_OFF}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="5" rx="1" /><rect x="3" y="15" width="18" height="5" rx="1" />
        </svg>
        Group by
        {value !== 'none' && (
          <span className="bg-brand-accent text-brand-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {GROUP_OPTIONS.find((o) => o.id === value)?.label}
          </span>
        )}
      </button>
      {open && (
        <div role="radiogroup" aria-label="Group by" className="absolute left-0 top-full mt-2 z-50 w-56 rounded-lg border border-brand-border-warm dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-2">
          <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-gray-400">Group by</p>
          {GROUP_OPTIONS.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
              <input
                type="radio"
                name="group-by"
                className="w-4 h-4 accent-brand-primary"
                checked={value === o.id}
                onChange={() => { onChange(o.id); setOpen(false) }}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface BoardToolbarProps {
  filters: BoardFilters
  onFilters: (next: BoardFilters) => void
  /** Every card, so the filter choices list what exists */
  cards: KanbanCard[]
  /** How many cards pass the filters */
  shown: number
  /** Extra controls (Columns, Group by) between Filters and Clear */
  children?: React.ReactNode
  /** Sits beside the count, e.g. a "Reset columns" link */
  trailing?: React.ReactNode
}

/** Search, filters, per-view controls and the count: one toolbar for the Board, List, Timeline and Calendar. */
export function BoardToolbar({ filters, onFilters, cards, shown, children, trailing }: BoardToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const allEmailTypes = useMemo(() => unique(cards.map((c) => c.emailType)), [cards])
  const allThemes = useMemo(() => unique(cards.map((c) => c.theme)), [cards])
  const allRegions = useMemo(() => unique(cards.flatMap((c) => c.region)), [cards])
  const allChannels = useMemo(() => unique(cards.flatMap((c) => c.channel)), [cards])
  const activeCount = activeFilterCount(filters)

  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onFilters({ ...filters, [key]: value })

  return (
    // Above the content, so the menus and the filter panel are never covered by sticky headings
    <div className="relative z-40 px-6 py-4 w-full shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search all fields..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
          />
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${filtersOpen || activeCount > 0 ? BUTTON_ON : BUTTON_OFF}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="bg-brand-accent text-brand-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {children}

        {/* Clear */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onFilters(DEFAULT_FILTERS)}
            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}

        {/* Result count */}
        <p className="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {trailing}
          {shown} of {cards.length} brief{cards.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="mt-3 bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div>
            <label className={LABEL}>Stage</label>
            <select value={filters.column} onChange={(e) => set('column', e.target.value)} className={FIELD}>
              <option value="">All stages</option>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Email Type</label>
            <select value={filters.emailType} onChange={(e) => set('emailType', e.target.value)} className={FIELD}>
              <option value="">All types</option>
              {allEmailTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Theme</label>
            <select value={filters.theme} onChange={(e) => set('theme', e.target.value)} className={FIELD}>
              <option value="">All themes</option>
              {allThemes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Region</label>
            <select value={filters.region} onChange={(e) => set('region', e.target.value)} className={FIELD}>
              <option value="">All regions</option>
              {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Channel</label>
            <select value={filters.channel} onChange={(e) => set('channel', e.target.value)} className={FIELD}>
              <option value="">All channels</option>
              {allChannels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Urgency</label>
            <select value={filters.urgency} onChange={(e) => set('urgency', e.target.value)} className={FIELD}>
              <option value="">All</option>
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Send Status</label>
            <select value={filters.sendStatus} onChange={(e) => set('sendStatus', e.target.value)} className={FIELD}>
              <option value="">All</option>
              <option value="overdue">Overdue</option>
              <option value="due-soon">Due soon</option>
              <option value="ok">On track</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Send Date From</label>
            <input type="date" value={filters.sendDateFrom} onChange={(e) => set('sendDateFrom', e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Send Date To</label>
            <input type="date" value={filters.sendDateTo} onChange={(e) => set('sendDateTo', e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Tags</label>
            <input type="text" value={filters.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Filter by tag..." className={`${FIELD} placeholder-gray-400`} />
          </div>
        </div>
      )}
    </div>
  )
}
