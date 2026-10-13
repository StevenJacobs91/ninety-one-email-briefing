import { useEffect, useRef, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES, BRAND_THEMES } from '../../lib/constants'
import { EmailPreviewBlock } from './EmailPreviewBlock'
import type { DragState } from './ContentEditorShell'

const PRESET_MODULES: Record<string, string[]> = {
  newsletter: ['header-image', 'body-content', 'article-list-v1', 'cta-single-primary', 'footer-v1'],
  'event-invitation': ['header-image', 'event-registration-1cta', 'speaker-2pm-1cta', 'footer-v1'],
  'webinar-invitation': ['header-image', 'event-registration-1cta', 'speaker-2pm-1cta', 'footer-v1'],
  'single-content': ['header-image', 'body-content', 'cta-single-primary', 'footer-v1'],
  'multiple-content': ['header-small', 'body-content', 'body-inner-content', 'cta-primary-secondary', 'footer-v1'],
  operational: ['header-small', 'body-content', 'footer-v2'],
}

const DEFAULT_PRESET = ['header-small', 'body-content', 'cta-single-primary', 'footer-v1']

const DEFAULT_THEME = { primary: '#134848', accent: '#fbaa96' }

interface BlockRect {
  top: number
  mid: number
  bottom: number
}

interface EmailCanvasProps {
  dragState: DragState | null
  dropIndex: number
  selectedKey: string | null
  onCanvasDragStart: (moduleId: string, index: number, e: React.PointerEvent) => void
  onBlockRectsUpdate: (rects: BlockRect[]) => void
  onSelectBlock: (key: string) => void
  onClearSelection: () => void
  onDelete: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDuplicate: (index: number) => void
}

export function EmailCanvas({
  dragState,
  dropIndex,
  selectedKey,
  onCanvasDragStart,
  onBlockRectsUpdate,
  onSelectBlock,
  onClearSelection,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: EmailCanvasProps) {
  const { watch, setValue } = useFormContext<BriefFormData>()
  const modules = watch('content.modules') ?? []
  const emailType = watch('campaign.emailType') ?? ''
  const themeId = watch('campaign.theme') ?? ''

  const theme = BRAND_THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME

  const blockRefs = useRef<(HTMLDivElement | null)[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)

  const isDragging = dragState !== null
  const moduleCount = modules.length

  const updateRects = useCallback(() => {
    const rects: BlockRect[] = blockRefs.current
      .filter((r): r is HTMLDivElement => r !== null)
      .map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          top: rect.top,
          mid: rect.top + rect.height / 2,
          bottom: rect.bottom,
        }
      })
    onBlockRectsUpdate(rects)
  }, [onBlockRectsUpdate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(updateRects)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [updateRects])

  useEffect(() => {
    updateRects()
  }, [modules, updateRects])

  function applyPreset(preset: string[]) {
    setValue('content.modules', preset, { shouldValidate: true })
  }

  const preset = PRESET_MODULES[emailType] ?? DEFAULT_PRESET

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-y-auto flex flex-col items-center"
      style={{ background: '#2c3240' }}
      onClick={onClearSelection}
      aria-label="Email canvas"
    >
      {/* Toolbar */}
      <div
        className="w-full flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: '#242837', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="px-3 py-1 text-xs font-medium rounded text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            Desktop
          </button>
          <button
            type="button"
            className="px-3 py-1 text-xs font-medium rounded text-gray-400 hover:text-gray-200 transition-colors"
          >
            Mobile
          </button>
        </div>
        <div className="flex items-center gap-2">
          {moduleCount > 0 && (
            <span className="text-xs font-medium text-gray-400 tabular-nums">
              {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
            </span>
          )}
          {isDragging && (
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#134848', color: '#fbaa96' }}>
              Dragging...
            </span>
          )}
        </div>
      </div>

      {/* Email frame */}
      <div className="w-full max-w-[600px] my-6 px-4" onClick={(e) => e.stopPropagation()}>
        {modules.length === 0 ? (
          <div
            className="bg-white rounded shadow-2xl overflow-hidden flex flex-col items-center justify-center min-h-[320px] text-center px-8 py-12"
          >
            <div className="mb-4">
              <svg
                className="w-10 h-10 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
                style={{ color: '#d1d5db' }}
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <p className="text-sm font-semibold text-gray-500 mb-1">Drag modules from the library</p>
              <p className="text-xs text-gray-400 mb-5">or start with a preset for this email type</p>
            </div>
            <div className="w-full max-w-xs">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Suggested for{' '}
                <span className="capitalize font-semibold" style={{ color: '#134848' }}>
                  {emailType.replace(/-/g, ' ') || 'this email type'}
                </span>
                :
              </p>
              <div className="flex flex-wrap gap-1 justify-center mb-4">
                {preset.map((id) => {
                  const m = EMAIL_MODULES.find((mod) => mod.id === id)
                  return (
                    <span key={id} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">
                      {m?.label ?? id}
                    </span>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-4 py-2 text-white text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
                style={{ background: '#134848' }}
              >
                Start with this preset
              </button>
            </div>

            {isDragging && (
              <div
                className="mt-6 w-full rounded-md flex items-center justify-center py-3"
                style={{ border: '2px dashed #134848', background: 'rgba(19,72,72,0.05)' }}
              >
                <span className="text-xs font-medium" style={{ color: '#134848' }}>Drop here</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded shadow-2xl overflow-hidden">
            {modules.map((moduleId, index) => {
              const blockKey = `${moduleId}-${index}`
              const isSelected = selectedKey === blockKey
              const isBeingDragged = dragState?.source === 'canvas' && dragState.originIndex === index

              return (
                <div key={blockKey}>
                  <DropZone index={index} dropIndex={dropIndex} isDragging={isDragging} />

                  <div
                    ref={(el) => { blockRefs.current[index] = el }}
                    className="relative group"
                    style={{
                      opacity: isBeingDragged ? 0.25 : 1,
                      outline: isSelected ? '2px solid #134848' : 'none',
                      outlineOffset: -2,
                      cursor: 'pointer',
                      transition: 'outline 0.1s',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectBlock(blockKey)
                    }}
                    data-canvas-block="true"
                    aria-label={`${EMAIL_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId} module block`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onSelectBlock(blockKey)
                    }}
                  >
                    {/* Hover toolbar */}
                    <div
                      className="absolute top-0 right-0 z-10 flex items-center gap-0.5 bg-white border border-gray-200 rounded-bl-md shadow-md px-1 py-0.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Drag handle */}
                      <div
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-grab rounded transition-colors touch-none"
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          const el = e.currentTarget
                          el.setPointerCapture(e.pointerId)
                          onCanvasDragStart(moduleId, index, e)
                        }}
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                        role="button"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <circle cx="9" cy="5" r="1.8" />
                          <circle cx="15" cy="5" r="1.8" />
                          <circle cx="9" cy="12" r="1.8" />
                          <circle cx="15" cy="12" r="1.8" />
                          <circle cx="9" cy="19" r="1.8" />
                          <circle cx="15" cy="19" r="1.8" />
                        </svg>
                      </div>

                      {/* Move up */}
                      <button
                        type="button"
                        onClick={() => onMoveUp(index)}
                        disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                        title="Move up"
                        aria-label="Move module up"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* Move down */}
                      <button
                        type="button"
                        onClick={() => onMoveDown(index)}
                        disabled={index === modules.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                        title="Move down"
                        aria-label="Move module down"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => onDuplicate(index)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded transition-colors"
                        title="Duplicate module"
                        aria-label="Duplicate module"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <rect x="8" y="8" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDelete(index)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded transition-colors"
                        title="Remove module"
                        aria-label="Remove module"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Email section preview */}
                    <EmailPreviewBlock
                      moduleId={moduleId}
                      theme={{ primary: theme.primary, accent: theme.accent }}
                      isSelected={isSelected}
                    />

                    {/* Selection indicator bar at bottom */}
                    {isSelected && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5"
                        style={{ background: '#134848' }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              )
            })}

            {/* Final drop zone */}
            <DropZone index={modules.length} dropIndex={dropIndex} isDragging={isDragging} />
          </div>
        )}
      </div>
    </div>
  )
}

interface DropZoneProps {
  index: number
  dropIndex: number
  isDragging: boolean
}

function DropZone({ index, dropIndex, isDragging }: DropZoneProps) {
  const isActive = isDragging && dropIndex === index

  return (
    <div
      className="transition-all duration-150 relative"
      style={{
        height: isActive ? 28 : 2,
        background: isActive ? 'rgba(19,72,72,0.08)' : 'transparent',
      }}
      aria-hidden="true"
    >
      {isActive && (
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-3 rounded-full"
          style={{ height: 2, background: '#09d09c' }}
        />
      )}
    </div>
  )
}
