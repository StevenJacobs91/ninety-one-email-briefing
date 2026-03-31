import { useState, useCallback } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { getThemeColours } from '../../lib/themeColours'
import { KanbanCardDetail } from './KanbanCardDetail'

type SortOption = 'send-asc' | 'send-desc' | 'submitted-asc' | 'submitted-desc' | 'urgency-first'

const COLUMN_ORDER: KanbanColumn[] = ['briefed', 'in-progress', 'distributed']

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; headerBg: string; emptyMessage: string }> = {
  briefed: {
    label: 'Briefed',
    headerBg: 'bg-brand-primary',
    emptyMessage: 'No briefs yet. Briefs appear here when submitted.',
  },
  'in-progress': {
    label: 'In Progress',
    headerBg: 'bg-[#221b3b]',
    emptyMessage: 'Move briefed cards here when production begins.',
  },
  distributed: {
    label: 'Distributed',
    headerBg: 'bg-[#0a3323]',
    emptyMessage: 'Completed campaigns appear here.',
  },
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function getSendDateStatus(sendDate: string): 'overdue' | 'due-soon' | 'ok' {
  if (!sendDate) return 'ok'
  const today = new Date()
  const date = new Date(sendDate)
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due-soon'
  return 'ok'
}

function getAgeLabel(card: KanbanCard): string {
  const lastEntry = card.columnHistory[card.columnHistory.length - 1]
  const ageMs = Date.now() - new Date(lastEntry?.at ?? card.submittedAt).getTime()
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
  const ageLabel = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`
  return `${ageLabel} in ${COLUMN_CONFIG[card.column].label}`
}

function sortCards(cards: KanbanCard[], sort: SortOption): KanbanCard[] {
  const copy = [...cards]
  switch (sort) {
    case 'send-asc':
      return copy.sort((a, b) => a.sendDate.localeCompare(b.sendDate))
    case 'send-desc':
      return copy.sort((a, b) => b.sendDate.localeCompare(a.sendDate))
    case 'submitted-asc':
      return copy.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    case 'submitted-desc':
      return copy.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    case 'urgency-first':
      return copy.sort((a, b) => {
        if (a.urgency === b.urgency) return a.sendDate.localeCompare(b.sendDate)
        return a.urgency === 'urgent' ? -1 : 1
      })
    default:
      return copy
  }
}

interface KanbanCardTileProps {
  card: KanbanCard
  onView: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
}

function KanbanCardTile({ card, onView, onDragStart }: KanbanCardTileProps) {
  const { moveCard } = useKanban()
  const colours = getThemeColours(card.theme)
  const sendStatus = getSendDateStatus(card.sendDate)
  const ageLabel = getAgeLabel(card)
  const colIndex = COLUMN_ORDER.indexOf(card.column)
  const prevCol = colIndex > 0 ? COLUMN_ORDER[colIndex - 1] : null
  const nextCol = colIndex < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[colIndex + 1] : null

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      {/* Top row: name + urgency */}
      <div className="flex items-start gap-2 mb-2">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight flex-1 min-w-0 truncate">
          {card.emailName}
        </p>
        {card.urgency === 'urgent' && (
          <span className="shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
            Urgent
          </span>
        )}
      </div>

      {/* Email type */}
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
        {card.emailType}
      </p>

      {/* Theme swatch */}
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: colours.primary }}
          title={`Primary: ${colours.primary}`}
        />
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
          style={{ backgroundColor: colours.accent }}
          title={`Accent: ${colours.accent}`}
        />
        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{card.theme}</span>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-3">
        <div>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">Region</p>
          <p className="text-gray-700 dark:text-gray-300 truncate" title={card.region.join(', ')}>
            {card.region.join(' · ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">Channel</p>
          <p className="text-gray-700 dark:text-gray-300 truncate" title={card.channel.join(', ')}>
            {card.channel.join(' · ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">Send Date</p>
          <div className="flex items-center gap-1.5">
            {sendStatus === 'overdue' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            )}
            {sendStatus === 'due-soon' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
            {sendStatus === 'ok' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            )}
            <p className={`font-medium ${sendStatus === 'overdue' ? 'text-red-600 dark:text-red-400' : sendStatus === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {formatDate(card.sendDate)}
            </p>
          </div>
        </div>
        {card.tags && (
          <div>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider">Tags</p>
            <p className="text-gray-700 dark:text-gray-300 truncate">{card.tags}</p>
          </div>
        )}
      </div>

      {/* Send date badge */}
      {sendStatus === 'overdue' && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
            Overdue
          </span>
        </div>
      )}
      {sendStatus === 'due-soon' && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            Due soon
          </span>
        </div>
      )}

      {/* Age indicator */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">{ageLabel}</p>

      {/* Bottom row: quick move + view */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-3">
        {prevCol && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); moveCard(card.id, prevCol) }}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Move to ${COLUMN_CONFIG[prevCol].label}`}
            title={`Move to ${COLUMN_CONFIG[prevCol].label}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {nextCol && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); moveCard(card.id, nextCol) }}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Move to ${COLUMN_CONFIG[nextCol].label}`}
            title={`Move to ${COLUMN_CONFIG[nextCol].label}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => onView(card)}
          className="ml-auto text-[11px] font-medium text-brand-primary dark:text-brand-accent hover:underline transition-colors px-2 py-1"
        >
          View
        </button>
      </div>
    </div>
  )
}

interface KanbanColumnPanelProps {
  column: KanbanColumn
  cards: KanbanCard[]
  onViewCard: (card: KanbanCard) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) => void
}

function KanbanColumnPanel({ column, cards, onViewCard, onDragStart, onDrop }: KanbanColumnPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const config = COLUMN_CONFIG[column]

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    setIsDragOver(false)
    onDrop(e, column)
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden min-w-0 flex-1">
      {/* Column header */}
      <div className={`${config.headerBg} px-4 py-3 flex items-center gap-3`}>
        <h3 className="font-ni-display text-[#e8e5ce] text-base leading-none flex-1">{config.label}</h3>
        <span className="bg-brand-accent/20 text-brand-accent text-xs font-medium px-2.5 py-1 rounded-full">
          {cards.length}
        </span>
      </div>

      {/* Column body */}
      <div
        className={`flex-1 bg-gray-100/60 dark:bg-gray-800/40 p-3 space-y-3 min-h-[200px] transition-colors ${isDragOver ? 'bg-brand-accent/5 ring-2 ring-inset ring-brand-accent/30' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {cards.length === 0 ? (
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragOver ? 'border-brand-accent/50 bg-brand-accent/5' : 'border-gray-300 dark:border-gray-600'}`}>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{config.emptyMessage}</p>
          </div>
        ) : (
          cards.map((card) => (
            <KanbanCardTile
              key={card.id}
              card={card}
              onView={onViewCard}
              onDragStart={onDragStart}
            />
          ))
        )}
        {isDragOver && cards.length > 0 && (
          <div className="border-2 border-dashed border-brand-accent/50 rounded-lg h-16 bg-brand-accent/5 flex items-center justify-center">
            <p className="text-xs text-brand-accent font-medium">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  onClose: () => void
}

export function KanbanBoard({ onClose }: KanbanBoardProps) {
  const { cards, moveCard } = useKanban()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('send-asc')
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)

  const today = new Date()

  const overdueCount = cards.filter((c) => {
    if (!c.sendDate) return false
    return new Date(c.sendDate) < today
  }).length

  const dueSoonCount = cards.filter((c) => {
    if (!c.sendDate) return false
    const date = new Date(c.sendDate)
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  }).length

  const filterCards = useCallback((columnCards: KanbanCard[]) => {
    if (!search.trim()) return columnCards
    const q = search.toLowerCase()
    return columnCards.filter(
      (c) =>
        c.emailName.toLowerCase().includes(q) ||
        c.region.some((r) => r.toLowerCase().includes(q)) ||
        c.tags.toLowerCase().includes(q) ||
        c.emailType.toLowerCase().includes(q)
    )
  }, [search])

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, cardId: string) {
    e.dataTransfer.setData('text/plain', cardId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingCardId(cardId)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, column: KanbanColumn) {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId) {
      moveCard(cardId, column)
    }
    setDraggingCardId(null)
  }

  // Suppress unused variable warning
  void draggingCardId

  function getColumnCards(column: KanbanColumn): KanbanCard[] {
    const colCards = cards.filter((c) => c.column === column)
    const filtered = filterCards(colCards)
    return sortCards(filtered, sort)
  }

  return (
    <div className="min-h-screen bg-brand-bg-warm dark:bg-[#1a1714] flex flex-col">
      {/* Hero band */}
      <div className="bg-brand-primary px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-end justify-between gap-6">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1.5">Marketing Operations</p>
            <h1 className="font-ni-display text-[#e8e5ce] text-3xl lg:text-4xl leading-none tracking-tight">
              Campaign Board
            </h1>
            <p className="text-[#e8e5ce]/60 text-sm mt-2">
              Track email briefs from briefing through to distribution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center gap-2 text-white/70 hover:text-white text-xs tracking-[0.12em] uppercase font-ni-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent px-3 py-2 border border-white/20 hover:border-white/40 rounded"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Briefing
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white dark:bg-gray-900 border-b border-brand-border-warm dark:border-gray-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-accent" />
            <span className="font-medium text-gray-700 dark:text-gray-300">{cards.length}</span>
            <span className="text-gray-500 dark:text-gray-400">total</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-medium text-red-600 dark:text-red-400">{overdueCount}</span>
              <span className="text-gray-500 dark:text-gray-400">overdue</span>
            </div>
          )}
          {dueSoonCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-medium text-amber-600 dark:text-amber-400">{dueSoonCount}</span>
              <span className="text-gray-500 dark:text-gray-400">due this week</span>
            </div>
          )}
        </div>
      </div>

      {/* Search + sort controls */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, region, or tag..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="kanban-sort" className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Sort
            </label>
            <select
              id="kanban-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
            >
              <option value="send-asc">Send Date (earliest first)</option>
              <option value="send-desc">Send Date (latest first)</option>
              <option value="submitted-asc">Submitted (oldest first)</option>
              <option value="submitted-desc">Submitted (newest first)</option>
              <option value="urgency-first">Urgency first</option>
            </select>
          </div>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 items-start overflow-x-auto pb-4">
            {COLUMN_ORDER.map((column) => (
              <KanbanColumnPanel
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
      </div>

      {/* Card detail drawer */}
      {selectedCard && (
        <KanbanCardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
