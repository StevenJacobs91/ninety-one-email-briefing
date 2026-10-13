import { useRef, useState } from 'react'
import type { WorkflowNode } from '../../types/workflow.types'

interface WorkflowNodeCardProps {
  node: WorkflowNode
  selected: boolean
  onSelect: () => void
  onMove: (id: string, x: number, y: number) => void
  onEdit?: () => void
  onDelete?: () => void
  isConnecting: boolean
  onConnectStart?: () => void
  onConnectEnd?: () => void
}

const ROLE_DISPLAY: Record<string, string> = {
  brand_guardian: 'Brand Guardian',
  legal:          'Legal',
  manager:        'Manager',
  reviewer:       'Reviewer',
}

export function WorkflowNodeCard({
  node,
  selected,
  onSelect,
  onMove,
  onEdit,
  onDelete,
  isConnecting,
  onConnectStart,
  onConnectEnd,
}: WorkflowNodeCardProps) {
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const hasDraggedRef = useRef(false)
  const [hovered, setHovered] = useState(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Middle or right click — ignore
    if (e.button !== 0) return
    // If we're in connecting mode, let the click through to handleClick
    if (isConnecting) return

    e.stopPropagation()
    isDraggingRef.current = true
    hasDraggedRef.current = false
    dragOffsetRef.current = {
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    }
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    hasDraggedRef.current = true
    const newX = e.clientX - dragOffsetRef.current.x
    const newY = e.clientY - dragOffsetRef.current.y
    onMove(node.id, newX, newY)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    if (!hasDraggedRef.current) {
      onSelect()
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isConnecting) {
      e.stopPropagation()
      onConnectEnd?.()
    }
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (node.type === 'approval') {
      e.stopPropagation()
      onEdit?.()
    }
  }

  const basePointerProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  const ringClass = selected
    ? 'ring-2 ring-brand-primary dark:ring-brand-accent'
    : ''

  if (node.type === 'start') {
    return (
      <div
        style={{ position: 'absolute', left: node.position.x, top: node.position.y }}
        className="flex flex-col items-center gap-1 select-none"
        {...basePointerProps}
      >
        <div
          className={`w-10 h-10 rounded-full bg-green-500 border-2 border-green-600 cursor-pointer flex items-center justify-center ${ringClass}`}
          title="Start"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polygon points="4,2 12,7 4,12" fill="white" />
          </svg>
        </div>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Start</span>
      </div>
    )
  }

  if (node.type === 'end') {
    return (
      <div
        style={{ position: 'absolute', left: node.position.x, top: node.position.y }}
        className="flex flex-col items-center gap-1 select-none"
        {...basePointerProps}
      >
        <div
          className={`w-10 h-10 rounded-full bg-red-500 border-2 border-red-600 cursor-pointer flex items-center justify-center ${ringClass}`}
          title="End"
        >
          <div className="w-3 h-3 rounded-full bg-white" />
        </div>
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">End</span>
      </div>
    )
  }

  if (node.type === 'gateway') {
    return (
      <div
        style={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
        }}
        className="flex flex-col items-center gap-1 select-none"
        {...basePointerProps}
      >
        <div
          className={`w-10 h-10 bg-amber-400 dark:bg-amber-500 border-2 border-amber-500 cursor-pointer ${ringClass}`}
          style={{ transform: 'rotate(45deg)', borderRadius: '4px' }}
          title={node.label ?? 'Gateway'}
        />
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {node.label ?? 'Gateway'}
        </span>
      </div>
    )
  }

  // Approval node
  const stage = node.stageConfig
  const roleLabel = stage ? (ROLE_DISPLAY[stage.role] ?? stage.role.replace(/_/g, ' ')) : ''
  const displayLabel = node.label || roleLabel

  return (
    <div
      style={{ position: 'absolute', left: node.position.x, top: node.position.y }}
      className={`
        w-36 rounded-lg border bg-white dark:bg-gray-800
        border-gray-200 dark:border-gray-700
        shadow-sm cursor-pointer select-none
        ${ringClass}
        ${isConnecting ? 'ring-2 ring-brand-accent/60' : ''}
      `}
      {...basePointerProps}
      title="Double-click to edit"
    >
      {/* Delete button — top right, visible on hover */}
      {hovered && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs leading-none hover:bg-red-600 z-10 shadow"
          aria-label="Delete node"
        >
          ×
        </button>
      )}

      <div className="px-3 pt-2.5 pb-2">
        {/* Role chip */}
        <span className="block text-[9px] font-semibold tracking-widest uppercase text-brand-primary dark:text-brand-accent opacity-70 mb-0.5">
          {roleLabel}
        </span>

        {/* Label */}
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight truncate">
          {displayLabel}
        </p>

        {/* Due days badge */}
        {stage?.dueDaysFromRequest != null && (
          <span className="mt-1.5 inline-block text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
            {stage.dueDaysFromRequest}d
          </span>
        )}
      </div>

      {/* Connect port — right edge */}
      {!isConnecting && (
        <button
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-brand-primary dark:bg-brand-accent border-2 border-white dark:border-gray-800 hover:scale-125 transition-transform z-10"
          onClick={(e) => {
            e.stopPropagation()
            onConnectStart?.()
          }}
          aria-label="Start connection"
          title="Drag to connect"
        />
      )}
    </div>
  )
}
