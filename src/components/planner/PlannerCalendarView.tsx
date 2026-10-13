import { useState, useMemo } from 'react'
import type { KanbanCard } from '../../types/kanban.types'
import { CampaignCardDetail } from './CampaignCardDetail'

function isoToLocalDate(iso: string): Date | null {
  if (!iso) return null
  try { return new Date(iso + 'T00:00:00') } catch { return null }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface PlannerCalendarViewProps {
  cards: KanbanCard[]
  search: string
}

export function PlannerCalendarView({ cards, search }: PlannerCalendarViewProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startPad = firstDay.getDay() // day of week offset

    const days: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(viewYear, viewMonth, d))
    }
    // Pad to complete final week
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [viewYear, viewMonth])

  // Filter cards
  const filteredCards = useMemo(() => {
    if (!search.trim()) return cards
    const q = search.toLowerCase()
    return cards.filter((c) =>
      c.emailName.toLowerCase().includes(q) ||
      c.emailType.toLowerCase().includes(q) ||
      (c.assignee ?? '').toLowerCase().includes(q)
    )
  }, [cards, search])

  // Cards by send date
  const cardsByDate = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    for (const card of filteredCards) {
      const date = isoToLocalDate(card.sendDate)
      if (!date) continue
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(card)
    }
    return map
  }, [filteredCards])

  // Cards with approval date
  const approvalsByDate = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    for (const card of filteredCards) {
      const date = isoToLocalDate(card.contentApprovalDate)
      if (!date) continue
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(card)
    }
    return map
  }, [filteredCards])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function goToToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const hasThisMonth = calendarDays.some((d) => d && sameDay(d, today))

  return (
    <>
      {/* Calendar header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <h2 className="font-ni-display text-brand-primary dark:text-brand-accent text-xl leading-none">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>

        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        {!hasThisMonth && (
          <button
            type="button"
            onClick={goToToday}
            className="ml-2 text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded hover:bg-brand-primary/5 dark:hover:bg-brand-accent/5 transition-colors"
          >
            Today
          </button>
        )}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-accent" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Send date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Approval date</span>
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Day name row */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`pad-${i}`} className="bg-gray-50 dark:bg-gray-900/50 min-h-[80px]" />
            }

            const isToday = sameDay(day, today)
            const isPast = day < today
            const dateKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            const sendCards = cardsByDate.get(dateKey) ?? []
            const approvalCards = approvalsByDate.get(dateKey) ?? []
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <div
                key={dateKey}
                className={`bg-white dark:bg-gray-900 min-h-[80px] p-1.5 flex flex-col ${isPast ? 'opacity-70' : ''} ${isWeekend ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-brand-primary text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {day.getDate()}
                  </span>
                </div>

                {/* Approval date indicators */}
                {approvalCards.length > 0 && (
                  <div className="space-y-0.5 mb-0.5">
                    {approvalCards.slice(0, 2).map((card) => (
                      <button
                        key={`appr-${card.id}`}
                        type="button"
                        onClick={() => setSelectedCard(card)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[9px] text-amber-700 dark:text-amber-400 truncate leading-none">{card.emailName}</span>
                        </div>
                      </button>
                    ))}
                    {approvalCards.length > 2 && (
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 pl-1">+{approvalCards.length - 2} more</p>
                    )}
                  </div>
                )}

                {/* Send date indicators */}
                {sendCards.length > 0 && (
                  <div className="space-y-0.5">
                    {sendCards.slice(0, 2).map((card) => (
                      <button
                        key={`send-${card.id}`}
                        type="button"
                        onClick={() => setSelectedCard(card)}
                        className="w-full text-left"
                      >
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          card.urgency === 'urgent'
                            ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'bg-brand-primary/8 dark:bg-brand-primary/20 hover:bg-brand-primary/15 dark:hover:bg-brand-primary/30'
                        } transition-colors`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.urgency === 'urgent' ? 'bg-red-500' : 'bg-brand-primary dark:bg-brand-accent'}`} />
                          <span className={`text-[9px] truncate leading-none ${card.urgency === 'urgent' ? 'text-red-700 dark:text-red-400' : 'text-brand-primary dark:text-brand-accent'}`}>
                            {card.emailName}
                          </span>
                        </div>
                      </button>
                    ))}
                    {sendCards.length > 2 && (
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 pl-1">+{sendCards.length - 2} more</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Month stats */}
        {(() => {
          const monthCards = filteredCards.filter((c) => {
            const d = isoToLocalDate(c.sendDate)
            return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth
          })
          const urgentCount = monthCards.filter((c) => c.urgency === 'urgent').length
          if (monthCards.length === 0) return null
          return (
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{monthCards.length}</span> campaign{monthCards.length !== 1 ? 's' : ''} sending this month
              {urgentCount > 0 && <span className="text-red-600 dark:text-red-400">{urgentCount} urgent</span>}
            </div>
          )
        })()}
      </div>

      {selectedCard && (
        <CampaignCardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  )
}
