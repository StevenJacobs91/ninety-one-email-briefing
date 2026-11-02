import { useState, useMemo } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { getThemeColours } from '../../lib/themeColours'
import { CardDetailDrawer } from './CardDetailDrawer'
import { BoardToolbar, GroupByMenu } from './BoardToolbar'
import { applyFilters, type BoardFilters } from '../../lib/boardFilters'
import { GROUP_OPTIONS, groupCards, type GroupField } from '../../lib/boardGrouping'

const COLUMN_COLORS: Record<KanbanColumn, { bar: string; text: string }> = {
  briefed: { bar: 'bg-brand-primary', text: 'text-[#e8e5ce]' },
  'in-progress': { bar: 'bg-[#221b3b]', text: 'text-[#e8e5ce]' },
  distributed: { bar: 'bg-[#0a3323]', text: 'text-[#e8e5ce]' },
}

function isoToDate(iso: string): Date | null {
  if (!iso) return null
  try { return new Date(iso + 'T00:00:00') } catch { return null }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDayShort(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Calculate bar position as percentages within the visible range
function calcBar(card: KanbanCard, rangeStart: Date, rangeEnd: Date): { left: number; width: number } | null {
  const totalMs = rangeEnd.getTime() - rangeStart.getTime()
  if (totalMs <= 0) return null

  // Bar spans from startDate (or contentApprovalDate or sendDate-7d) to sendDate
  const rawStart = isoToDate(card.startDate ?? '') ?? isoToDate(card.contentApprovalDate) ?? addDays(isoToDate(card.sendDate) ?? new Date(), -7)
  const rawEnd = isoToDate(card.sendDate) ?? new Date()

  const clampedStart = rawStart < rangeStart ? rangeStart : rawStart
  const clampedEnd = rawEnd > rangeEnd ? rangeEnd : rawEnd

  if (clampedStart > rangeEnd || clampedEnd < rangeStart) return null

  const left = ((clampedStart.getTime() - rangeStart.getTime()) / totalMs) * 100
  const width = Math.max(1, ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100)
  return { left, width }
}

interface TimelineViewProps {
  cards: KanbanCard[]
  filters: BoardFilters
  onFilters: (next: BoardFilters) => void
}

const GROUP_KEY = 'ni-board-timeline-group'

function loadGroupField(): GroupField {
  try {
    const raw = localStorage.getItem(GROUP_KEY)
    return GROUP_OPTIONS.some((o) => o.id === raw) ? (raw as GroupField) : 'none'
  } catch {
    return 'none'
  }
}

export function TimelineView({ cards, filters, onFilters }: TimelineViewProps) {
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [groupField, setGroupField] = useState<GroupField>(() => loadGroupField())
  const [rangeWeeks, setRangeWeeks] = useState(12)

  // Calculate range
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Always start at start-of-week containing today, minus 1 week buffer
  const rangeStart = useMemo(() => addDays(startOfWeek(today), -7), [today])
  const rangeEnd = useMemo(() => addDays(rangeStart, rangeWeeks * 7), [rangeStart, rangeWeeks])

  // Week markers
  const weekMarkers = useMemo(() => {
    const markers: Date[] = []
    const cur = new Date(rangeStart)
    while (cur <= rangeEnd) {
      markers.push(new Date(cur))
      cur.setDate(cur.getDate() + 7)
    }
    return markers
  }, [rangeStart, rangeEnd])

  // Today position
  const todayLeft = useMemo(() => {
    const totalMs = rangeEnd.getTime() - rangeStart.getTime()
    return ((today.getTime() - rangeStart.getTime()) / totalMs) * 100
  }, [today, rangeStart, rangeEnd])

  // Filter cards, soonest send date first
  const filteredCards = useMemo(
    () => [...applyFilters(cards, filters)].sort((a, b) => (a.sendDate || '9999').localeCompare(b.sendDate || '9999')),
    [cards, filters],
  )
  const groups = useMemo(() => groupCards(filteredCards, groupField), [filteredCards, groupField])

  function chooseGroup(next: GroupField) {
    setGroupField(next)
    try {
      if (next === 'none') localStorage.removeItem(GROUP_KEY)
      else localStorage.setItem(GROUP_KEY, next)
    } catch { /* the choice just is not remembered */ }
  }

  return (
    <>
      <BoardToolbar filters={filters} onFilters={onFilters} cards={cards} shown={filteredCards.length}>
        <GroupByMenu value={groupField} onChange={chooseGroup} />
      </BoardToolbar>

      {/* Range */}
      <div className="flex items-center gap-3 px-6 pt-1 pb-3 shrink-0 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Range</p>
        <div className="flex items-center rounded-lg border border-brand-border-warm dark:border-gray-700 overflow-hidden">
          {[8, 12, 16, 24].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setRangeWeeks(w)}
              className={`px-3 py-1.5 text-xs font-ni-heading tracking-[0.08em] transition-colors border-r border-brand-border-warm dark:border-gray-700 last:border-r-0 ${rangeWeeks === w ? 'bg-brand-primary text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {w}w
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatDayLabel(rangeStart)} — {formatDayLabel(rangeEnd)}
        </p>
      </div>

      {/* Timeline grid */}
      <div className="flex-1 overflow-auto">
        {filteredCards.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-gray-400 dark:text-gray-500">No campaigns to display on the timeline</p>
          </div>
        ) : (
          <div className="min-w-[700px]">
            {/* Header: week markers */}
            <div className="flex sticky top-0 z-10 bg-brand-bg-warm dark:bg-[#1a1714] border-b border-gray-200 dark:border-gray-700">
              {/* Row label column */}
              <div className="w-48 shrink-0 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Campaign</p>
              </div>
              {/* Timeline header */}
              <div className="flex-1 relative h-9 overflow-hidden">
                {weekMarkers.map((wk, i) => {
                  const totalMs = rangeEnd.getTime() - rangeStart.getTime()
                  const left = ((wk.getTime() - rangeStart.getTime()) / totalMs) * 100
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full flex flex-col justify-center"
                      style={{ left: `${left}%` }}
                    >
                      <div className="w-px h-full bg-gray-200 dark:bg-gray-700" />
                      <span className="absolute top-1.5 left-1 text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDayShort(wk)}</span>
                    </div>
                  )
                })}
                {/* Today line in header */}
                {todayLeft >= 0 && todayLeft <= 100 && (
                  <div
                    className="absolute top-0 h-full w-px bg-brand-accent z-10"
                    style={{ left: `${todayLeft}%` }}
                  />
                )}
              </div>
            </div>

            {/* Rows */}
            {groups.map((group) => (
              <div key={group.key}>
                {groupField !== 'none' && (
                  <div className="sticky left-0 flex items-center gap-2.5 px-4 py-2 bg-brand-primary text-white dark:text-[#e8e5ce] text-sm font-semibold border-b border-gray-200 dark:border-gray-700">
                    {group.label}
                    <span className="bg-brand-accent text-brand-primary text-[11px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center">{group.cards.length}</span>
                  </div>
                )}
            {group.cards.map((card) => {
              const bar = calcBar(card, rangeStart, rangeEnd)
              const colours = getThemeColours(card.theme)
              const colColors = COLUMN_COLORS[card.column]
              const sendDate = isoToDate(card.sendDate)

              return (
                <div
                  key={card.id}
                  className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  {/* Row label */}
                  <div className="w-48 shrink-0 px-4 py-2.5 border-r border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setSelectedCard(card)}
                      className="text-left w-full"
                    >
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">{card.emailName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} />
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} />
                        {card.assignee && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{card.assignee}</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex-1 relative py-2 h-12 overflow-hidden">
                    {/* Column grid lines */}
                    {weekMarkers.map((wk, i) => {
                      const totalMs = rangeEnd.getTime() - rangeStart.getTime()
                      const left = ((wk.getTime() - rangeStart.getTime()) / totalMs) * 100
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-full w-px bg-gray-100 dark:bg-gray-800"
                          style={{ left: `${left}%` }}
                        />
                      )
                    })}

                    {/* Today line */}
                    {todayLeft >= 0 && todayLeft <= 100 && (
                      <div
                        className="absolute top-0 h-full w-px bg-brand-accent/50 z-10"
                        style={{ left: `${todayLeft}%` }}
                      />
                    )}

                    {/* Progress bar */}
                    {bar && (
                      <button
                        type="button"
                        onClick={() => setSelectedCard(card)}
                        className={`absolute top-1.5 bottom-1.5 ${colColors.bar} rounded flex items-center px-2 min-w-[2px] overflow-hidden group/bar hover:brightness-110 transition-all`}
                        style={{ left: `calc(${bar.left}% + 1px)`, width: `calc(${bar.width}% - 2px)` }}
                        title={card.emailName}
                      >
                        <span className={`text-[9px] font-medium truncate ${colColors.text} opacity-90 group-hover/bar:opacity-100`}>
                          {bar.width > 8 ? card.emailName : ''}
                        </span>
                        {typeof card.progress === 'number' && card.progress > 0 && (
                          <div
                            className="absolute inset-0 bg-white/20 rounded"
                            style={{ width: `${card.progress}%` }}
                          />
                        )}
                      </button>
                    )}

                    {/* Send date marker (diamond) */}
                    {sendDate && (() => {
                      const totalMs = rangeEnd.getTime() - rangeStart.getTime()
                      const sendLeft = ((sendDate.getTime() - rangeStart.getTime()) / totalMs) * 100
                      if (sendLeft < 0 || sendLeft > 100) return null
                      const isOverdue = sendDate < today
                      return (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 ${isOverdue ? 'bg-red-400 border-red-600' : 'bg-brand-accent border-brand-primary'} z-20 cursor-pointer hover:scale-125 transition-transform`}
                          style={{ left: `calc(${sendLeft}% - 6px)` }}
                          title={`Send: ${card.sendDate}`}
                          onClick={() => setSelectedCard(card)}
                        />
                      )
                    })()}
                  </div>
                </div>
              )
            })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6 bg-gray-50 dark:bg-gray-800/30">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 bg-brand-primary rounded" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Briefed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 bg-[#221b3b] rounded" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 bg-[#0a3323] rounded" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Distributed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rotate-45 bg-brand-accent border-2 border-brand-primary" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Send date</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-brand-accent" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Today</span>
        </div>
      </div>

      {selectedCard && (
        <CardDetailDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  )
}
