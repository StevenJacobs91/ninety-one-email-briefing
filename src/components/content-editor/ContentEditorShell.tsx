import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFormContext } from 'react-hook-form'
import type { BriefFormData } from '../../lib/schema'
import { EMAIL_MODULES, BRAND_THEMES } from '../../lib/constants'
import { ModuleLibraryPanel } from './ModuleLibraryPanel'
import { EmailCanvas } from './EmailCanvas'
import { ModuleSettingsPanel } from './ModuleSettingsPanel'
import { EmailPreviewBlock } from './EmailPreviewBlock'

export interface DragState {
  source: 'library' | 'canvas'
  moduleId: string
  originIndex: number | null
  clientX: number
  clientY: number
  ghostOffsetY: number
  ghostLeft: number
  ghostWidth: number
}

interface BlockRect {
  top: number
  mid: number
  bottom: number
}

function calcDropIndex(clientY: number, rects: BlockRect[]): number {
  for (let i = 0; i < rects.length; i++) {
    if (clientY < rects[i].mid) return i
  }
  return rects.length
}

const DEFAULT_THEME = { primary: '#134848', accent: '#fbaa96' }

export function ContentEditorShell() {
  const { getValues, setValue, watch } = useFormContext<BriefFormData>()

  const themeId = watch('campaign.theme') ?? ''
  const themeData = BRAND_THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME
  const theme = { primary: themeData.primary, accent: themeData.accent }

  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dropIndex, setDropIndex] = useState<number>(-1)
  // selectedKey format: `${moduleId}-${index}`
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const blockRectsRef = useRef<BlockRect[]>([])

  function handleLibraryDragStart(moduleId: string, e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    setDragState({
      source: 'library',
      moduleId,
      originIndex: null,
      clientX: e.clientX,
      clientY: e.clientY,
      ghostOffsetY: e.clientY - rect.top,
      ghostLeft: rect.left,
      ghostWidth: rect.width,
    })
    setDropIndex(calcDropIndex(e.clientY, blockRectsRef.current))
  }

  function handleCanvasDragStart(moduleId: string, index: number, e: React.PointerEvent) {
    const target = e.currentTarget as HTMLElement
    const blockEl = target.closest('[data-canvas-block]') as HTMLElement | null
    const rect = blockEl ? blockEl.getBoundingClientRect() : target.getBoundingClientRect()

    setDragState({
      source: 'canvas',
      moduleId,
      originIndex: index,
      clientX: e.clientX,
      clientY: e.clientY,
      ghostOffsetY: e.clientY - rect.top,
      ghostLeft: rect.left,
      ghostWidth: rect.width,
    })
    setDropIndex(index)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState) return

    const newDropIndex = calcDropIndex(e.clientY, blockRectsRef.current)
    setDragState((prev) => {
      if (!prev) return null
      return { ...prev, clientX: e.clientX, clientY: e.clientY }
    })
    setDropIndex(newDropIndex)
  }

  function handlePointerUp() {
    if (!dragState) return

    const modules = getValues('content.modules') ?? []
    const targetIndex = dropIndex < 0 ? modules.length : dropIndex

    if (dragState.source === 'library') {
      const next = [...modules]
      next.splice(targetIndex, 0, dragState.moduleId)
      setValue('content.modules', next, { shouldValidate: true })
      // Auto-select the newly dropped module
      setSelectedKey(`${dragState.moduleId}-${targetIndex}`)
    } else if (dragState.source === 'canvas' && dragState.originIndex !== null) {
      const originIndex = dragState.originIndex
      if (originIndex !== targetIndex && originIndex !== targetIndex - 1) {
        const next = [...modules]
        const [removed] = next.splice(originIndex, 1)
        const insertAt = targetIndex > originIndex ? targetIndex - 1 : targetIndex
        next.splice(insertAt, 0, removed)
        setValue('content.modules', next, { shouldValidate: true })
      }
    }

    setDragState(null)
    setDropIndex(-1)
  }

  function handleBlockRectsUpdate(rects: BlockRect[]) {
    blockRectsRef.current = rects
  }

  // Derive selected module id and index from selectedKey
  function getSelectedParts(): { moduleId: string; index: number } | null {
    if (!selectedKey) return null
    const modules = getValues('content.modules') ?? []
    // key is `${moduleId}-${index}` but moduleId itself may contain `-`
    // so we find by matching the index suffix
    const lastDash = selectedKey.lastIndexOf('-')
    const moduleId = selectedKey.substring(0, lastDash)
    const index = parseInt(selectedKey.substring(lastDash + 1), 10)
    if (isNaN(index) || !modules[index] || modules[index] !== moduleId) return null
    return { moduleId, index }
  }

  function handleDelete(index: number) {
    const modules = getValues('content.modules') ?? []
    const next = modules.filter((_, i) => i !== index)
    setValue('content.modules', next, { shouldValidate: true })

    // Clear selection if deleted block was selected
    const parts = getSelectedParts()
    if (parts && parts.index === index) {
      setSelectedKey(null)
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const modules = getValues('content.modules') ?? []
    const next = [...modules]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setValue('content.modules', next, { shouldValidate: true })

    // Update selection to follow moved block
    const parts = getSelectedParts()
    if (parts && parts.index === index) {
      setSelectedKey(`${parts.moduleId}-${index - 1}`)
    }
  }

  function handleMoveDown(index: number) {
    const modules = getValues('content.modules') ?? []
    if (index === modules.length - 1) return
    const next = [...modules]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setValue('content.modules', next, { shouldValidate: true })

    // Update selection to follow moved block
    const parts = getSelectedParts()
    if (parts && parts.index === index) {
      setSelectedKey(`${parts.moduleId}-${index + 1}`)
    }
  }

  function handleDuplicate(index: number) {
    const modules = getValues('content.modules') ?? []
    const next = [...modules]
    next.splice(index + 1, 0, modules[index])
    setValue('content.modules', next, { shouldValidate: true })
    // Select the duplicate
    setSelectedKey(`${modules[index]}-${index + 1}`)
  }

  const selectedParts = getSelectedParts()
  const modules = watch('content.modules') ?? []

  // Ghost element for drag
  const mod = dragState ? EMAIL_MODULES.find((m) => m.id === dragState.moduleId) : null
  const ghostElement =
    dragState && mod
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[9999] rounded shadow-2xl overflow-hidden select-none"
            style={{
              left: dragState.ghostLeft,
              top: dragState.clientY - dragState.ghostOffsetY,
              width: Math.min(dragState.ghostWidth, 220),
              opacity: 0.75,
              border: '2px solid #134848',
            }}
            aria-hidden="true"
          >
            {/* Mini preview at 50% scale */}
            <div
              style={{
                transformOrigin: 'top left',
                transform: 'scale(0.5)',
                width: '200%',
                pointerEvents: 'none',
              }}
            >
              <EmailPreviewBlock moduleId={dragState.moduleId} theme={theme} />
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <div
        className="flex rounded-xl overflow-hidden border border-gray-200"
        style={{
          height: 720,
          userSelect: dragState ? 'none' : undefined,
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Left: Block library */}
        <ModuleLibraryPanel onDragStart={handleLibraryDragStart} />

        {/* Center: Email canvas */}
        <EmailCanvas
          dragState={dragState}
          dropIndex={dropIndex}
          selectedKey={selectedKey}
          onCanvasDragStart={handleCanvasDragStart}
          onBlockRectsUpdate={handleBlockRectsUpdate}
          onSelectBlock={setSelectedKey}
          onClearSelection={() => setSelectedKey(null)}
          onDelete={handleDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDuplicate={handleDuplicate}
        />

        {/* Right: Settings panel — slides in when a block is selected */}
        {selectedParts && (
          <ModuleSettingsPanel
            key={selectedKey}
            moduleId={selectedParts.moduleId}
            index={selectedParts.index}
            isFirst={selectedParts.index === 0}
            isLast={selectedParts.index === modules.length - 1}
            onClose={() => setSelectedKey(null)}
            onDelete={() => handleDelete(selectedParts.index)}
            onMoveUp={() => handleMoveUp(selectedParts.index)}
            onMoveDown={() => handleMoveDown(selectedParts.index)}
            onDuplicate={() => handleDuplicate(selectedParts.index)}
          />
        )}
      </div>
      {ghostElement}
    </>
  )
}
