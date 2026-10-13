import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES } from '../../lib/constants'

const CATEGORY_COLORS: Record<string, string> = {
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

interface ModuleSettingsPanelProps {
  moduleId: string
  index: number
  onClose: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  isFirst: boolean
  isLast: boolean
}

export function ModuleSettingsPanel({
  moduleId,
  index,
  onClose,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
}: ModuleSettingsPanelProps) {
  const { getValues, setValue, watch } = useFormContext<BriefFormData>()

  const moduleNotes = watch('content.moduleNotes') ?? {}
  const note = moduleNotes[`${moduleId}-${index}`] ?? ''

  const mod = EMAIL_MODULES.find((m) => m.id === moduleId)
  const categoryColor = mod ? (CATEGORY_COLORS[mod.category] ?? '#9ca3af') : '#9ca3af'

  function handleNoteChange(value: string) {
    const current = getValues('content.moduleNotes') ?? {}
    setValue(
      'content.moduleNotes',
      { ...current, [`${moduleId}-${index}`]: value },
      { shouldValidate: false }
    )
  }

  if (!mod) return null

  return (
    <div className="w-[280px] shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-0.5 h-6 rounded-full shrink-0" style={{ background: categoryColor }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{mod.label}</p>
            <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{mod.category}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors shrink-0"
          aria-label="Close settings panel"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Module description */}
      {mod.description && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">{mod.description}</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actions</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Down
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title="Duplicate module"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <rect x="8" y="8" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Notes</p>
          <span className={`text-[10px] font-medium tabular-nums ${note.length > 450 ? 'text-amber-500' : 'text-gray-400'}`}>
            {note.length}/500
          </span>
        </div>
        <textarea
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Add notes or instructions for this module — e.g. tone, specific content requirements, asset references..."
          rows={6}
          maxLength={500}
          className="w-full text-xs rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#134848]/20 focus:border-[#134848] resize-none placeholder-gray-400 text-gray-700 leading-relaxed flex-1"
        />
      </div>

      {/* Remove button */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Remove module
        </button>
      </div>
    </div>
  )
}
