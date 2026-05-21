import { useState, useEffect, useCallback } from 'react'
import { useKanban } from '../../contexts/KanbanContext'
import { PlannerKanbanView } from './PlannerKanbanView'
import { PlannerListView } from './PlannerListView'
import { PlannerTimelineView } from './PlannerTimelineView'
import { PlannerCalendarView } from './PlannerCalendarView'
import { AddCampaignModal } from './AddCampaignModal'

type PlannerView = 'kanban' | 'list' | 'timeline' | 'calendar'

const VIEW_PREFERENCE_KEY = 'ni-campaign-planner-view'

function getSavedView(): PlannerView {
  try {
    const v = localStorage.getItem(VIEW_PREFERENCE_KEY)
    if (v === 'kanban' || v === 'list' || v === 'timeline' || v === 'calendar') return v
  } catch { /* ignore */ }
  return 'kanban'
}

const VIEW_CONFIG: { id: PlannerView; label: string; icon: React.ReactNode }[] = [
  {
    id: 'kanban',
    label: 'Kanban',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="10" rx="1" />
        <rect x="14" y="17" width="7" height="4" rx="1" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="18" y2="18" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

interface CampaignPlannerShellProps {
  onClose: () => void
}

export function CampaignPlannerShell({ onClose }: CampaignPlannerShellProps) {
  const { cards } = useKanban()
  const [view, setView] = useState<PlannerView>(getSavedView)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [sort, setSort] = useState<'send-asc' | 'send-desc' | 'submitted-desc' | 'urgency-first' | 'progress-desc'>('send-asc')

  // Persist view preference
  useEffect(() => {
    try { localStorage.setItem(VIEW_PREFERENCE_KEY, view) } catch { /* ignore */ }
  }, [view])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAddModal) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, showAddModal])

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueCount = cards.filter((c) => c.sendDate && new Date(c.sendDate + 'T00:00:00') < today && c.column !== 'distributed').length
  const dueSoonCount = cards.filter((c) => {
    if (!c.sendDate || c.column === 'distributed') return false
    const diff = Math.ceil((new Date(c.sendDate + 'T00:00:00').getTime() - today.getTime()) / 86400000)
    return diff >= 0 && diff <= 7
  }).length

  const handleViewChange = useCallback((v: PlannerView) => {
    setView(v)
    setSearch('') // reset search on view change
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg-warm dark:bg-[#1a1714] overflow-hidden flex flex-col">

      {/* ── Hero band ── */}
      <div className="bg-brand-primary shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-5 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-brand-accent text-xs tracking-[0.2em] uppercase font-ni-heading mb-1.5">Marketing Operations</p>
            <h1 className="font-ni-display text-[#e8e5ce] text-3xl leading-none tracking-tight">Campaign Planner</h1>
            <p className="text-[#e8e5ce]/60 text-sm mt-2">Plan, track and manage all marketing campaigns across your team.</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View switcher */}
            <div className="flex items-center rounded-lg border border-white/20 overflow-hidden">
              {VIEW_CONFIG.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleViewChange(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-ni-heading tracking-[0.1em] uppercase transition-colors ${
                    i > 0 ? 'border-l border-white/20' : ''
                  } ${
                    view === v.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                  aria-pressed={view === v.id}
                >
                  {v.icon}
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            {/* Add campaign */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-brand-accent text-brand-primary text-xs font-medium tracking-[0.08em] uppercase px-4 py-2 hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Campaign
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 text-white/70 hover:text-white text-xs tracking-[0.12em] uppercase font-ni-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent px-3 py-2 border border-white/20 hover:border-white/40 rounded"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats + Search strip ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-brand-border-warm dark:border-gray-700 shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
          {/* Stats */}
          <div className="flex items-center gap-4 mr-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-accent" />
              <span className="font-medium text-gray-700 dark:text-gray-300">{cards.length}</span>
              <span className="text-gray-500 dark:text-gray-400">total</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">{overdueCount}</span>
                <span className="text-gray-500 dark:text-gray-400">overdue</span>
              </div>
            )}
            {dueSoonCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-medium text-amber-600 dark:text-amber-400">{dueSoonCount}</span>
                <span className="text-gray-500 dark:text-gray-400">due this week</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns, assignees, tags..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-brand-border-warm dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent focus:border-transparent"
            />
          </div>

          {/* Current view label */}
          <div className="ml-auto hidden md:flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">View:</span>
            <span className="text-xs font-medium text-brand-primary dark:text-brand-accent capitalize">{view}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-[1600px] w-full mx-auto">
        {view === 'kanban' && (
          <PlannerKanbanView
            cards={cards}
            sort={sort}
            onSortChange={setSort}
            search={search}
          />
        )}
        {view === 'list' && (
          <PlannerListView cards={cards} search={search} />
        )}
        {view === 'timeline' && (
          <PlannerTimelineView cards={cards} search={search} />
        )}
        {view === 'calendar' && (
          <PlannerCalendarView cards={cards} search={search} />
        )}
      </div>

      {/* Add campaign modal */}
      {showAddModal && (
        <AddCampaignModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}
