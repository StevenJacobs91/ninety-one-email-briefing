import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { BRAND_THEMES } from '../../lib/constants'
import { EmailPreviewBlock } from './EmailPreviewBlock'

const DEFAULT_THEME = { primary: '#134848', accent: '#fbaa96' }

const CATEGORY_LEFT_COLORS: Record<string, string> = {
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

interface ModuleLibraryCardProps {
  module: { id: string; label: string; category: string; description?: string }
  onDragStart: (moduleId: string, e: React.PointerEvent) => void
}

export function ModuleLibraryCard({ module, onDragStart }: ModuleLibraryCardProps) {
  const { watch } = useFormContext<BriefFormData>()
  const themeId = watch('campaign.theme') ?? ''
  const themeData = BRAND_THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME
  const theme = { primary: themeData.primary, accent: themeData.accent }

  const borderColor = CATEGORY_LEFT_COLORS[module.category] ?? '#9ca3af'

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    onDragStart(module.id, e)
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded mx-2 my-1.5 cursor-grab select-none hover:shadow-md hover:border-gray-300 transition-all duration-150 overflow-hidden"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onPointerDown={handlePointerDown}
      role="button"
      aria-label={`Drag ${module.label} to canvas`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // keyboard add not supported in drag-only flow, but give accessible label
        }
      }}
    >
      {/* Thumbnail preview */}
      <div
        className="w-full overflow-hidden bg-gray-50 relative"
        style={{ height: 60 }}
        aria-hidden="true"
      >
        <div
          style={{
            transformOrigin: 'top left',
            transform: 'scale(0.38)',
            width: `${100 / 0.38}%`,
            pointerEvents: 'none',
          }}
        >
          <EmailPreviewBlock moduleId={module.id} theme={theme} />
        </div>
      </div>

      {/* Label row */}
      <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-700 truncate leading-tight">{module.label}</p>
        <span
          className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-gray-400 transition-colors"
          style={{ fontSize: 12 }}
          aria-hidden="true"
        >
          ⠿
        </span>
      </div>
    </div>
  )
}
