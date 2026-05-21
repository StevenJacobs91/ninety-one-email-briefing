import { useState, useMemo } from 'react'
import { EMAIL_MODULES } from '../../lib/constants'
import { ModuleLibraryCard } from './ModuleLibraryCard'

const ALL_CATEGORIES = Array.from(new Set(EMAIL_MODULES.map((m) => m.category)))

const CATEGORY_DOT_COLORS: Record<string, string> = {
  Headers:    '#60a5fa',
  Content:    '#4ade80',
  CTAs:       '#fb923c',
  Events:     '#c084fc',
  Speakers:   '#f472b6',
  Articles:   '#fbbf24',
  Media:      '#f87171',
  Navigation: '#818cf8',
  Footers:    '#9ca3af',
}

interface ModuleLibraryPanelProps {
  onDragStart: (moduleId: string, e: React.PointerEvent) => void
}

export function ModuleLibraryPanel({ onDragStart }: ModuleLibraryPanelProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase()
    return EMAIL_MODULES.filter((m) => {
      const matchesCategory = activeCategory === null || m.category === activeCategory
      const matchesSearch =
        !q ||
        m.label.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  return (
    <div className="w-[260px] shrink-0 flex flex-col overflow-hidden touch-none" style={{ background: '#f3f4f6', borderRight: '1px solid #e5e7eb' }}>
      {/* Panel header */}
      <div className="px-3 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Blocks</p>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="w-full pl-7 pr-6 py-1.5 text-xs border border-gray-200 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#134848]/30 focus:border-[#134848] placeholder-gray-400"
            aria-label="Search blocks"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category pill tabs — horizontal scroll */}
      <div
        className="flex gap-1 px-2 py-2 overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid #e5e7eb', scrollbarWidth: 'none' }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
            activeCategory === null
              ? 'text-white border-transparent'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
          style={activeCategory === null ? { background: '#134848', borderColor: '#134848' } : {}}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const dotColor = CATEGORY_DOT_COLORS[cat] ?? '#9ca3af'
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={isActive ? { background: '#134848', borderColor: '#134848' } : {}}
            >
              {!isActive && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} aria-hidden="true" />
              )}
              {cat}
            </button>
          )
        })}
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filteredModules.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 px-3">No blocks found.</p>
        ) : (
          filteredModules.map((mod) => (
            <ModuleLibraryCard
              key={mod.id}
              module={mod}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  )
}
