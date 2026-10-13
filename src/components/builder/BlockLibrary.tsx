import { useState, useRef } from 'react'
import { createBlock } from './utils/blockDefaults'
import { BUILDER_TEMPLATES } from './utils/templates'
import { useBuilder } from './BuilderContext'
import { EMAIL_MODULES } from '../../lib/constants'
import type { BlockType, Block } from './types'

const MODULE_CATEGORIES = Array.from(new Set(EMAIL_MODULES.map((m) => m.category)))

const CATEGORY_COLORS: Record<string, string> = {
  Headers: 'bg-blue-100 text-blue-700',
  Content: 'bg-green-100 text-green-700',
  CTAs: 'bg-orange-100 text-orange-700',
  Events: 'bg-purple-100 text-purple-700',
  Speakers: 'bg-pink-100 text-pink-700',
  Articles: 'bg-amber-100 text-amber-700',
  Media: 'bg-red-100 text-red-700',
  Navigation: 'bg-indigo-100 text-indigo-700',
  Footers: 'bg-gray-100 text-gray-600',
}

interface BlockLibraryProps {
  onDragStart: (block: Block) => void
  onDragEnd: () => void
  onAddBlock: (block: Block) => void
}

const BLOCK_TYPES: { type: BlockType; label: string; preview: React.ReactNode }[] = [
  {
    type: 'hero',
    label: 'Hero',
    preview: (
      <div className="h-14 w-full rounded bg-[#134848] flex flex-col items-center justify-center px-2 py-1 gap-0.5">
        <div className="w-10 h-1 bg-white/70 rounded-full" />
        <div className="w-14 h-1.5 bg-white rounded-full" />
        <div className="w-12 h-1 bg-white/50 rounded-full" />
      </div>
    ),
  },
  {
    type: 'text',
    label: 'Text',
    preview: (
      <div className="h-14 w-full rounded bg-white border border-gray-100 flex flex-col justify-center px-3 gap-1.5">
        <div className="w-full h-1 bg-gray-300 rounded-full" />
        <div className="w-4/5 h-1 bg-gray-300 rounded-full" />
        <div className="w-full h-1 bg-gray-300 rounded-full" />
      </div>
    ),
  },
  {
    type: 'image',
    label: 'Image',
    preview: (
      <div className="h-14 w-full rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    ),
  },
  {
    type: 'button',
    label: 'Button',
    preview: (
      <div className="h-14 w-full rounded bg-white border border-gray-100 flex items-center justify-center">
        <div className="px-4 py-1.5 rounded bg-[#fbaa96] text-[#134848] text-[10px] font-bold">Read More</div>
      </div>
    ),
  },
  {
    type: 'columns',
    label: 'Columns',
    preview: (
      <div className="h-14 w-full rounded bg-white border border-gray-100 flex gap-1.5 p-2">
        <div className="flex-1 bg-gray-100 rounded border border-gray-200" />
        <div className="flex-1 bg-gray-100 rounded border border-gray-200" />
      </div>
    ),
  },
  {
    type: 'spacer',
    label: 'Spacer',
    preview: (
      <div className="h-14 w-full rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
        <span className="text-gray-400 text-lg">↕</span>
      </div>
    ),
  },
  {
    type: 'divider',
    label: 'Divider',
    preview: (
      <div className="h-14 w-full rounded bg-white border border-gray-100 flex items-center px-3">
        <div className="w-full h-px bg-gray-300" />
      </div>
    ),
  },
  {
    type: 'social',
    label: 'Social',
    preview: (
      <div className="h-14 w-full rounded bg-white border border-gray-100 flex items-center justify-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-[#134848]" />
        <div className="w-6 h-6 rounded-full bg-[#134848]" />
        <div className="w-6 h-6 rounded-full bg-[#134848]" />
      </div>
    ),
  },
]

export function BlockLibrary({ onDragStart, onDragEnd, onAddBlock }: BlockLibraryProps) {
  const { state, dispatch } = useBuilder()
  const [blocksOpen, setBlocksOpen] = useState(true)
  const [modulesOpen, setModulesOpen] = useState(true)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch] = useState('')
  const draggingRef = useRef<Block | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, type: BlockType, moduleId?: string) {
    e.preventDefault()
    const newBlock = createBlock(type, moduleId)
    draggingRef.current = newBlock
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    onDragStart(newBlock)
  }

  function handlePointerUp() {
    draggingRef.current = null
    onDragEnd()
  }

  const filteredModules = EMAIL_MODULES.filter((m) => {
    const matchesCategory = activeCategory === 'All' || m.category === activeCategory
    const matchesSearch = search === '' || m.label.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function handleApplyTemplate(templateId: string) {
    const template = BUILDER_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    if (state.blocks.length > 0) {
      if (!window.confirm('Replace the current email with this template?')) return
    }
    dispatch({ type: 'LOAD_TEMPLATE', blocks: template.blocks, config: template.config })
  }

  return (
    <aside className="w-[280px] shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Block Library</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Basic Blocks */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setBlocksOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Basic Blocks</span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${blocksOpen ? '' : '-rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {blocksOpen && (
            <div className="grid grid-cols-2 gap-2 p-3">
              {BLOCK_TYPES.map(({ type, label, preview }) => (
                <div
                  key={type}
                  onPointerDown={(e) => handlePointerDown(e, type)}
                  onPointerUp={handlePointerUp}
                  onClick={() => onAddBlock(createBlock(type))}
                  className="flex flex-col gap-1.5 cursor-grab active:cursor-grabbing select-none bg-white dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:shadow-sm transition-all"
                  title={`Click or drag to add ${label} block`}
                >
                  {preview}
                  <p className="text-[11px] font-medium text-center text-gray-600 dark:text-gray-300">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ninety One Modules */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setModulesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ninety One Modules</span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${modulesOpen ? '' : '-rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {modulesOpen && (
            <div className="px-3 pb-3">
              {/* Search */}
              <div className="relative mb-2">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                />
              </div>

              {/* Category pills */}
              <div className="flex gap-1 flex-wrap mb-2">
                {['All', ...MODULE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-[#134848] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Module list */}
              <div className="flex flex-col gap-1">
                {filteredModules.map((mod) => (
                  <div
                    key={mod.id}
                    onPointerDown={(e) => handlePointerDown(e, 'module', mod.id)}
                    onPointerUp={handlePointerUp}
                    onClick={() => onAddBlock(createBlock('module', mod.id))}
                    className="flex items-center gap-2.5 cursor-grab active:cursor-grabbing select-none bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:shadow-sm transition-all"
                    title={`Click or drag to add: ${mod.description}`}
                  >
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[mod.category] ?? 'bg-gray-100 text-gray-500'}`}>
                      {mod.category.slice(0, 3).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">{mod.label}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">{mod.description}</p>
                    </div>
                    <svg className="w-3 h-3 text-gray-300 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                ))}
                {filteredModules.length === 0 && (
                  <p className="text-[11px] text-gray-400 text-center py-3">No modules match "{search}"</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Templates */}
        <div>
          <button
            type="button"
            onClick={() => setTemplatesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Templates</span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${templatesOpen ? '' : '-rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {templatesOpen && (
            <div className="flex flex-col gap-1.5 p-3">
              {BUILDER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl.id)}
                  className="flex items-start gap-3 text-left bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:shadow-sm transition-all"
                >
                  <span className="text-xl shrink-0 mt-0.5">{tpl.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tpl.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{tpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
