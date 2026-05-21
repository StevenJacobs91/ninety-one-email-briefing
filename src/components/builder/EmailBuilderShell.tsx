import { useState, useRef } from 'react'
import { BuilderProvider, useBuilder } from './BuilderContext'
import { BlockLibrary } from './BlockLibrary'
import { BuilderCanvas } from './BuilderCanvas'
import { BuilderSettingsPanel } from './BuilderSettingsPanel'
import { BUILDER_TEMPLATES } from './utils/templates'
import type { Block } from './types'

interface TemplateSelectorModalProps {
  onSelect: (templateId: string | null) => void
}

function TemplateSelectorModal({ onSelect }: TemplateSelectorModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Start with a template</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a template to get started quickly, or start with a blank canvas.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Blank canvas option */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="w-full mb-4 flex items-center gap-4 text-left border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Blank canvas</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Start from scratch and build your own layout.</p>
            </div>
          </button>

          {/* Templates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUILDER_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelect(tpl.id)}
                className="flex items-start gap-3 text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-[#134848] dark:hover:border-[#fbaa96] hover:shadow-md transition-all bg-white dark:bg-gray-800"
              >
                <span className="text-2xl shrink-0 mt-0.5">{tpl.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tpl.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">{tpl.description}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{tpl.blocks.length} blocks</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface BuilderShellInnerProps {
  onClose: () => void
}

function BuilderShellInner({ onClose }: BuilderShellInnerProps) {
  const { state, dispatch } = useBuilder()
  const [showTemplateSelector, setShowTemplateSelector] = useState(state.blocks.length === 0)
  const [draggingBlock, setDraggingBlock] = useState<Block | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([])

  function handleTemplateSelect(templateId: string | null) {
    if (templateId) {
      const template = BUILDER_TEMPLATES.find((t) => t.id === templateId)
      if (template) {
        dispatch({ type: 'LOAD_TEMPLATE', blocks: template.blocks, config: template.config })
      }
    }
    setShowTemplateSelector(false)
  }

  function handleDragStart(block: Block) {
    setDraggingBlock(block)
  }

  function handleDragEnd() {
    setDraggingBlock(null)
    setDropIndex(null)
  }

  function handleAddBlock(block: Block) {
    dispatch({ type: 'ADD_BLOCK', block, afterIndex: state.blocks.length })
  }

  function handleDropZoneRef(idx: number, el: HTMLDivElement | null) {
    dropZoneRefs.current[idx] = el
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingBlock) return
    const y = e.clientY
    let bestIdx = 0
    let bestDist = Infinity
    dropZoneRefs.current.forEach((ref, i) => {
      if (!ref) return
      const rect = ref.getBoundingClientRect()
      const dist = Math.abs(y - (rect.top + rect.height / 2))
      if (dist < bestDist) { bestDist = dist; bestIdx = i }
    })
    setDropIndex(bestIdx)
  }

  function handlePointerUp() {
    if (draggingBlock && dropIndex !== null) {
      dispatch({ type: 'ADD_BLOCK', block: draggingBlock, afterIndex: dropIndex - 1 })
    }
    setDraggingBlock(null)
    setDropIndex(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex flex-1 overflow-hidden">
        <BlockLibrary onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAddBlock={handleAddBlock} />
        <BuilderCanvas
          onClose={onClose}
          draggingBlock={draggingBlock}
          dropIndex={dropIndex}
          onDropZoneRef={handleDropZoneRef}
        />
        <BuilderSettingsPanel />
      </div>

      {showTemplateSelector && (
        <TemplateSelectorModal onSelect={handleTemplateSelect} />
      )}
    </div>
  )
}

interface EmailBuilderShellProps {
  onClose: () => void
}

export function EmailBuilderShell({ onClose }: EmailBuilderShellProps) {
  return (
    <BuilderProvider>
      <BuilderShellInner onClose={onClose} />
    </BuilderProvider>
  )
}
