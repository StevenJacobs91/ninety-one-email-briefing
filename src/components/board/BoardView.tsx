import { useMemo, useState } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { CARD_FIELDS, fieldsForSurface, resolveListColumns, toggleListColumn, type BoardSettings } from '../../lib/boardConfig'
import { applyFilters, type BoardFilters } from '../../lib/boardFilters'
import { GROUP_OPTIONS, groupCards, type GroupField } from '../../lib/boardGrouping'
import { BoardCard, COLUMN_LABEL } from './BoardCard'
import { CardDetailDrawer } from './CardDetailDrawer'
import { BoardToolbar, ColumnsMenu, GroupByMenu } from './BoardToolbar'

type SortOption = 'send-asc' | 'send-desc' | 'submitted-asc' | 'submitted-desc' | 'urgency-first' | 'progress-desc'

const COLUMN_STYLE: Record<KanbanColumn, { headerBg: string; emptyMessage: string }> = {
  briefed: { headerBg: 'bg-brand-primary', emptyMessage: 'No briefs yet. Briefs appear here when submitted.' },
  'in-progress': { headerBg: 'bg-[#221b3b]', emptyMessage: 'Move briefed cards here when production begins.' },
  distributed: { headerBg: 'bg-[#0a3323]', emptyMessage: 'Completed campaigns appear here.' },
}

function sortCards(cards: KanbanCard[], sort: SortOption): KanbanCard[] {
  const copy = [...cards]
  switch (sort) {
    case 'send-asc': return copy.sort((a, b) => a.sendDate.localeCompare(b.sendDate))
    case 'send-desc': return copy.sort((a, b) => b.sendDate.localeCompare(a.sendDate))
    case 'submitted-asc': return copy.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    case 'submitted-desc': return copy.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    case 'progress-desc': return copy.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    case 'urgency-first':
      return copy.sort((a, b) => (a.urgency === b.urgency ? a.sendDate.localeCompare(b.sendDate) : a.urgency === 'urgent' ? -1 : 1))
  }
}

const GROUP_KEY = 'ni-board-kanban-group'
const FIELDS_KEY = 'ni-board-kanban-fields'

function loadGroupField(): GroupField {
  try {
    const raw = localStorage.getItem(GROUP_KEY)
    return GROUP_OPTIONS.some((o) => o.id === raw) ? (raw as GroupField) : 'none'
  } catch {
    return 'none'
  }
}

function loadFields(): string[] | undefined {
  try {
    const raw = localStorage.getItem(FIELDS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : undefined
    return Array.isArray(parsed) && parsed.every((x) => typeof x === 'string') ? parsed : undefined
  } catch {
    return undefined
  }
}

interface ColumnPanelProps {
  column: KanbanColumn
  cards: KanbanCard[]
  board: BoardSettings
  onViewCard: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) => void
}

function ColumnPanel({ column, cards, board, onViewCard, onDragStart, onDrop }: ColumnPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const style = COLUMN_STYLE[column]

  return (
    <div className="flex flex-col rounded-xl overflow-hidden min-w-[260px] flex-1">
      <div className={`${style.headerBg} px-4 py-3 flex items-center gap-3`}>
        <h3 className="font-ni-display text-[#e8e5ce] text-base leading-none flex-1">{COLUMN_LABEL[column]}</h3>
        <span className="bg-brand-accent/20 text-brand-accent text-xs font-medium px-2.5 py-1 rounded-full">{cards.length}</span>
      </div>
      <div
        className={`flex-1 bg-gray-100/60 dark:bg-gray-800/40 p-3 ${board.density === 'compact' ? 'space-y-2' : 'space-y-3'} min-h-[200px] transition-colors ${isDragOver ? 'bg-brand-accent/5 ring-2 ring-inset ring-brand-accent/30' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e, column) }}
      >
        {cards.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{style.emptyMessage}</p>
          </div>
        ) : (
          cards.map((card) => <BoardCard key={card.id} card={card} board={board} onView={onViewCard} onDragStart={onDragStart} />)
        )}
      </div>
    </div>
  )
}

interface Props {
  cards: KanbanCard[]
  board: BoardSettings
  filters: BoardFilters
  onFilters: (next: BoardFilters) => void
}

/** The Kanban view: one column per stage, showing the card fields the board settings ask for. */
export function BoardView({ cards, board, filters, onFilters }: Props) {
  const { moveCard } = useKanban()
  const [sort, setSort] = useState<SortOption>('send-asc')
  const [selected, setSelected] = useState<KanbanCard | null>(null)
  const [groupField, setGroupField] = useState<GroupField>(() => loadGroupField())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Each person can also choose which details the cards show; it is remembered in this browser.
  const [savedFields, setSavedFields] = useState<string[] | undefined>(() => loadFields())

  const visible = useMemo(() => applyFilters(cards, filters), [cards, filters])
  const groups = useMemo(() => groupCards(visible, groupField), [visible, groupField])

  const available = CARD_FIELDS.map((f) => f.id)
  const configured = fieldsForSurface(board, 'card')
  const shownFields = resolveListColumns(available, configured, savedFields, configured)
  const customised = savedFields !== undefined
  const cardBoard: BoardSettings = useMemo(
    () => ({
      ...board,
      separateListFields: false,
      cardFields: { order: [...shownFields, ...available.filter((id) => !shownFields.includes(id))], hidden: available.filter((id) => !shownFields.includes(id)) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, shownFields.join(',')],
  )

  function saveFields(next: string[] | undefined) {
    setSavedFields(next)
    try {
      if (next) localStorage.setItem(FIELDS_KEY, JSON.stringify(next))
      else localStorage.removeItem(FIELDS_KEY)
    } catch { /* the choice just is not remembered */ }
  }

  function chooseGroup(next: GroupField) {
    setGroupField(next)
    setCollapsed(new Set())
    try {
      if (next === 'none') localStorage.removeItem(GROUP_KEY)
      else localStorage.setItem(GROUP_KEY, next)
    } catch { /* the choice just is not remembered */ }
  }

  function toggleLane(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  function columnCards(inGroup: KanbanCard[], column: KanbanColumn): KanbanCard[] {
    return sortCards(inGroup.filter((c) => c.column === column), sort)
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, cardId: string) {
    e.dataTransfer.setData('text/plain', cardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId) moveCard(cardId, column)
  }

  const stageRow = (inGroup: KanbanCard[]) => (
    <div className="flex gap-4 items-start pb-4">
      {board.visibleColumns.map((column) => (
        <ColumnPanel key={column} column={column} cards={columnCards(inGroup, column)} board={cardBoard} onViewCard={setSelected} onDragStart={handleDragStart} onDrop={handleDrop} />
      ))}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <BoardToolbar
        filters={filters}
        onFilters={onFilters}
        cards={cards}
        shown={visible.length}
        trailing={customised ? (
          <button type="button" onClick={() => saveFields(undefined)} className="mr-3 text-xs text-brand-primary dark:text-brand-accent hover:underline">Reset fields</button>
        ) : null}
      >
        <ColumnsMenu
          label="Fields"
          menuTitle="Show on cards"
          items={CARD_FIELDS.map((f) => ({ id: f.id, label: f.label }))}
          shown={shownFields}
          onToggle={(id) => saveFields(toggleListColumn(shownFields, id, available))}
          onReset={customised ? () => saveFields(undefined) : undefined}
        />
        <GroupByMenu value={groupField} onChange={chooseGroup} />
      </BoardToolbar>
      <div className="px-6 pb-3 flex items-center gap-2 shrink-0">
        <label htmlFor="board-sort" className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Sort</label>
        <select
          id="board-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
        >
          <option value="send-asc">Send date (earliest first)</option>
          <option value="send-desc">Send date (latest first)</option>
          <option value="submitted-asc">Submitted (oldest first)</option>
          <option value="submitted-desc">Submitted (newest first)</option>
          <option value="urgency-first">Urgency first</option>
          <option value="progress-desc">Most progress first</option>
        </select>
      </div>
      <div className="flex-1 overflow-auto px-6 pb-8">
        {groupField === 'none' ? (
          stageRow(visible)
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const folded = collapsed.has(group.key)
              return (
                <section key={group.key} aria-label={`${group.label} group`}>
                  <button
                    type="button"
                    aria-expanded={!folded}
                    onClick={() => toggleLane(group.key)}
                    className="mb-3 inline-flex items-center gap-2.5 pl-4 pr-3 py-2 text-sm font-semibold rounded-xl bg-brand-primary text-white dark:text-[#e8e5ce] hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  >
                    <svg className={`transition-transform ${folded ? '-rotate-90' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                    {group.label}
                    <span className="bg-brand-accent text-brand-primary text-[11px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center">{group.cards.length}</span>
                  </button>
                  {!folded && stageRow(group.cards)}
                </section>
              )
            })}
          </div>
        )}
      </div>
      {selected && <CardDetailDrawer card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
