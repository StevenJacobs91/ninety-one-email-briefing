import { useState, useCallback } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { getThemeColours } from '../../lib/themeColours'
import { CampaignCardDetail } from './CampaignCardDetail'

type SortOption = 'send-asc' | 'send-desc' | 'submitted-desc' | 'urgency-first' | 'progress-desc'

const COLUMN_ORDER: KanbanColumn[] = ['briefed', 'in-progress', 'distributed']

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; headerBg: string; emptyMessage: string }> = {
  briefed: { label: 'Briefed', headerBg: 'bg-brand-primary', emptyMessage: 'No campaigns yet. Add one with the button above.' },
  'in-progress': { label: 'In Progress', headerBg: 'bg-[#221b3b]', emptyMessage: 'Move briefed campaigns here when production starts.' },
  distributed: { label: 'Distributed', headerBg: 'bg-[#0a3323]', emptyMessage: 'Completed campaigns appear here.' },
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) } catch { return iso }
}

function getSendStatus(sendDate: string): 'overdue' | 'due-soon' | 'ok' {
  if (!sendDate) return 'ok'
  const diffDays = Math.ceil((new Date(sendDate).getTime() - Date.now()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due-soon'
  return 'ok'
}

function sortCards(cards: KanbanCard[], sort: SortOption): KanbanCard[] {
  const copy = [...cards]
  switch (sort) {
    case 'send-asc': return copy.sort((a, b) => a.sendDate.localeCompare(b.sendDate))
    case 'send-desc': return copy.sort((a, b) => b.sendDate.localeCompare(a.sendDate))
    case 'submitted-desc': return copy.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    case 'urgency-first': return copy.sort((a, b) => a.urgency === b.urgency ? a.sendDate.localeCompare(b.sendDate) : a.urgency === 'urgent' ? -1 : 1)
    case 'progress-desc': return copy.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    default: return copy
  }
}

interface PlannerCardTileProps {
  card: KanbanCard
  onView: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
}

function PlannerCardTile({ card, onView, onDragStart }: PlannerCardTileProps) {
  const { moveCard } = useKanban()
  const colours = getThemeColours(card.theme)
  const sendStatus = getSendStatus(card.sendDate)
  const colIndex = COLUMN_ORDER.indexOf(card.column)
  const prevCol = colIndex > 0 ? COLUMN_ORDER[colIndex - 1] : null
  const nextCol = colIndex < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[colIndex + 1] : null
  const comments = card.comments ?? []

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => onView(card)}
      className="bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg p-3.5 cursor-pointer hover:shadow-md hover:border-brand-primary/30 dark:hover:border-brand-accent/30 transition-all select-none group"
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-1.5">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1 min-w-0 truncate group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">
          {card.emailName}
        </p>
        {card.urgency === 'urgent' && (
          <span className="shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1.5 py-0.5 rounded-full font-medium">Urgent</span>
        )}
      </div>

      {/* Email type */}
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
        {card.emailType.replace(/-/g, ' ')}
      </p>

      {/* Theme swatches */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} />
        <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} />
      </div>

      {/* Progress bar if set */}
      {typeof card.progress === 'number' && card.progress > 0 && (
        <div className="mb-2.5">
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
            <div className="h-1 rounded-full bg-brand-primary dark:bg-brand-accent" style={{ width: `${card.progress}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{card.progress}% complete</p>
        </div>
      )}

      {/* Send date */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sendStatus === 'overdue' ? 'bg-red-500' : sendStatus === 'due-soon' ? 'bg-amber-400' : 'bg-green-500'}`} />
        <span className={`text-xs font-medium ${sendStatus === 'overdue' ? 'text-red-600 dark:text-red-400' : sendStatus === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {formatDate(card.sendDate)}
        </span>
        {card.assignee && (
          <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[80px]">{card.assignee}</span>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-1 border-t border-gray-100 dark:border-gray-800 pt-2" onClick={(e) => e.stopPropagation()}>
        {prevCol && (
          <button
            type="button"
            onClick={() => moveCard(card.id, prevCol)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title={`Move to ${COLUMN_CONFIG[prevCol].label}`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {nextCol && (
          <button
            type="button"
            onClick={() => moveCard(card.id, nextCol)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title={`Move to ${COLUMN_CONFIG[nextCol].label}`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
        {comments.length > 0 && (
          <span className="ml-1 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            {comments.length}
          </span>
        )}
      </div>
    </div>
  )
}

interface ColumnPanelProps {
  column: KanbanColumn
  cards: KanbanCard[]
  onViewCard: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) => void
}

function ColumnPanel({ column, cards, onViewCard, onDragStart, onDrop }: ColumnPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const config = COLUMN_CONFIG[column]

  return (
    <div className="flex flex-col rounded-xl overflow-hidden min-w-[260px] flex-1">
      <div className={`${config.headerBg} px-4 py-3 flex items-center gap-3`}>
        <h3 className="font-ni-display text-[#e8e5ce] text-base leading-none flex-1">{config.label}</h3>
        <span className="bg-white/15 text-white/80 text-xs font-medium px-2 py-0.5 rounded-full">{cards.length}</span>
      </div>
      <div
        className={`flex-1 bg-gray-100/60 dark:bg-gray-800/40 p-3 space-y-2.5 min-h-[200px] transition-colors ${isDragOver ? 'bg-brand-accent/5 ring-2 ring-inset ring-brand-accent/30' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { setIsDragOver(false); onDrop(e, column) }}
      >
        {cards.length === 0 ? (
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver ? 'border-brand-accent/50 bg-brand-accent/5' : 'border-gray-300 dark:border-gray-600'}`}>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{config.emptyMessage}</p>
          </div>
        ) : (
          cards.map((card) => (
            <PlannerCardTile key={card.id} card={card} onView={onViewCard} onDragStart={onDragStart} />
          ))
        )}
        {isDragOver && cards.length > 0 && (
          <div className="border-2 border-dashed border-brand-accent/50 rounded-lg h-14 bg-brand-accent/5 flex items-center justify-center">
            <p className="text-xs text-brand-accent font-medium">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface PlannerKanbanViewProps {
  cards: KanbanCard[]
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  search: string
}

export function PlannerKanbanView({ cards, sort, onSortChange, search }: PlannerKanbanViewProps) {
  const { moveCard } = useKanban()
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)

  const filterCards = useCallback((columnCards: KanbanCard[]) => {
    if (!search.trim()) return columnCards
    const q = search.toLowerCase()
    return columnCards.filter((c) =>
      c.emailName.toLowerCase().includes(q) ||
      c.emailType.toLowerCase().includes(q) ||
      c.tags.toLowerCase().includes(q) ||
      (c.assignee ?? '').toLowerCase().includes(q)
    )
  }, [search])

  function getColumnCards(column: KanbanColumn): KanbanCard[] {
    return sortCards(filterCards(cards.filter((c) => c.column === column)), sort)
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) moveCard(id, column)
  }

  return (
    <>
      {/* Sort control */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-2 shrink-0">
        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Sort</label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
        >
          <option value="send-asc">Send Date (earliest first)</option>
          <option value="send-desc">Send Date (latest first)</option>
          <option value="submitted-desc">Newest first</option>
          <option value="urgency-first">Urgency first</option>
          <option value="progress-desc">Most progress first</option>
        </select>
      </div>

      {/* Board */}
      <div className="flex-1 px-6 pb-8 overflow-x-auto">
        <div className="flex gap-4 items-start min-h-full">
          {COLUMN_ORDER.map((column) => (
            <ColumnPanel
              key={column}
              column={column}
              cards={getColumnCards(column)}
              onViewCard={setSelectedCard}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      {selectedCard && (
        <CampaignCardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  )
}
