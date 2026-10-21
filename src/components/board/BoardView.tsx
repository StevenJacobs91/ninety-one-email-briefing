import { useState } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import type { BoardSettings } from '../../lib/boardConfig'
import { BoardCard, COLUMN_LABEL } from './BoardCard'
import { CardDetailDrawer } from './CardDetailDrawer'

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

function matches(c: KanbanCard, q: string): boolean {
  return (
    c.emailName.toLowerCase().includes(q) ||
    c.subjectLine.toLowerCase().includes(q) ||
    c.emailType.toLowerCase().includes(q) ||
    c.region.some((r) => r.toLowerCase().includes(q)) ||
    c.tags.toLowerCase().includes(q) ||
    (c.assignee ?? '').toLowerCase().includes(q) ||
    (c.submittedByName ?? '').toLowerCase().includes(q)
  )
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
  search: string
}

/** The Kanban view: one column per stage, showing the card fields the board settings ask for. */
export function BoardView({ cards, board, search }: Props) {
  const { moveCard } = useKanban()
  const [sort, setSort] = useState<SortOption>('send-asc')
  const [selected, setSelected] = useState<KanbanCard | null>(null)
  const q = search.trim().toLowerCase()

  function columnCards(column: KanbanColumn): KanbanCard[] {
    const inColumn = cards.filter((c) => c.column === column && (!q || matches(c, q)))
    return sortCards(inColumn, sort)
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 flex items-center gap-2 shrink-0">
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
        <div className="flex gap-4 items-start pb-4">
          {board.visibleColumns.map((column) => (
            <ColumnPanel key={column} column={column} cards={columnCards(column)} board={board} onViewCard={setSelected} onDragStart={handleDragStart} onDrop={handleDrop} />
          ))}
        </div>
      </div>
      {selected && <CardDetailDrawer card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
