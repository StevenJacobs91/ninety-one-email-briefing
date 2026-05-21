import { useState } from 'react'
import { useBuilder } from './BuilderContext'
import { renderBlockContent } from './BlockRenderer'
import { generateEmailHtml } from './utils/htmlExporter'
import type { Block } from './types'

interface BuilderCanvasProps {
  onClose: () => void
  draggingBlock: Block | null
  dropIndex: number | null
  onDropZoneRef: (idx: number, el: HTMLDivElement | null) => void
}

interface ExportModalProps {
  html: string
  onClose: () => void
}

function ExportModal({ html, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `email-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Export HTML</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#134848] text-white rounded-lg hover:bg-[#0d3232] transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy HTML
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {html}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function BuilderCanvas({ onClose, draggingBlock, dropIndex, onDropZoneRef }: BuilderCanvasProps) {
  const { state, dispatch, canUndo, canRedo } = useBuilder()
  const { blocks, selectedBlockId, viewport, emailConfig } = state
  const [showExport, setShowExport] = useState(false)

  const frameWidth = viewport === 'desktop' ? 600 : 375

  function handleSelectBlock(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    dispatch({ type: 'SELECT_BLOCK', id })
  }

  function handleDeselectBlock() {
    dispatch({ type: 'SELECT_BLOCK', id: null })
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const toIdx = idx + dir
    if (toIdx < 0 || toIdx >= blocks.length) return
    dispatch({ type: 'MOVE_BLOCK', fromIndex: idx, toIndex: toIdx })
  }

  function renderBlock(block: Block): React.ReactNode {
    return renderBlockContent(block, renderBlock)
  }

  const html = generateEmailHtml(blocks, emailConfig)

  return (
    <div className="flex-1 bg-[#2c3240] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[#1e2330] border-b border-white/10 px-4 py-2 flex items-center gap-2 shrink-0">
        {/* Back button */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          Back
        </button>

        <span className="text-white/30 text-xs">|</span>
        <span className="text-white/50 text-xs font-medium">Email Builder</span>

        <div className="flex-1" />

        {/* Viewport toggle */}
        <div className="flex bg-white/10 rounded-lg p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEWPORT', viewport: 'desktop' })}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewport === 'desktop' ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Desktop
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEWPORT', viewport: 'mobile' })}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewport === 'mobile' ? 'bg-white text-gray-900' : 'text-white/60 hover:text-white'}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <circle cx="12" cy="18" r="1" />
            </svg>
            Mobile
          </button>
        </div>

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          title="Undo"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          title="Redo"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#fbaa96] text-[#134848] font-semibold rounded-lg hover:bg-[#fca080] transition-colors ml-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export HTML
        </button>
      </div>

      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto flex justify-center py-8 px-4"
        onClick={handleDeselectBlock}
      >
        <div
          className="bg-white shadow-2xl relative"
          style={{ width: frameWidth, minHeight: 200, transition: 'width 0.2s ease' }}
        >
          {/* From bar */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#134848] flex items-center justify-center shrink-0">
              <span className="text-white text-[8px] font-bold">N</span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Ninety One</span>
            <span className="text-[11px] text-gray-400">&lt;marketing@ninetyone.com&gt;</span>
          </div>

          {/* Email background */}
          <div style={{ backgroundColor: emailConfig.backgroundColor }}>
            {/* Drop zone before first block */}
            <div
              ref={(el) => { onDropZoneRef(0, el) }}
              className={`w-full transition-all ${
                draggingBlock
                  ? dropIndex === 0
                    ? 'h-8 bg-[#134848]/20 border-2 border-dashed border-[#134848]'
                    : 'h-2 hover:h-6 hover:bg-[#134848]/10'
                  : 'h-0'
              }`}
            />

            {blocks.length === 0 && !draggingBlock && (
              <div className="flex items-center justify-center py-16 text-center px-8">
                <div>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Drag blocks here to build your email</p>
                  <p className="text-xs text-gray-400 mt-1">Or choose a template from the left panel</p>
                </div>
              </div>
            )}

            {blocks.map((block, idx) => {
              const isSelected = selectedBlockId === block.id

              return (
                <div key={block.id}>
                  {/* Canvas block wrapper */}
                  <div
                    className={`relative group cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-[#134848] ring-inset' : 'hover:ring-1 hover:ring-[#134848]/40 hover:ring-inset'
                    }`}
                    onClick={(e) => handleSelectBlock(block.id, e)}
                  >
                    {/* Block toolbar */}
                    <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-0.5 bg-white shadow-md rounded-md px-1 py-0.5 border border-gray-200">
                        <span className="text-gray-400 px-1 cursor-grab text-sm">⠿</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveBlock(idx, -1) }}
                          disabled={idx === 0}
                          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded"
                          title="Move up"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveBlock(idx, 1) }}
                          disabled={idx === blocks.length - 1}
                          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded"
                          title="Move down"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_BLOCK', id: block.id }) }}
                          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded"
                          title="Duplicate"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_BLOCK', id: block.id }) }}
                          className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Type label */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 z-10 bg-[#134848] text-white text-[10px] px-1.5 py-0.5 rounded-br font-medium uppercase tracking-wider">
                        {block.type}
                      </div>
                    )}

                    {renderBlock(block)}
                  </div>

                  {/* Drop zone after this block */}
                  <div
                    ref={(el) => { onDropZoneRef(idx + 1, el) }}
                    className={`w-full transition-all ${
                      draggingBlock
                        ? dropIndex === idx + 1
                          ? 'h-8 bg-[#134848]/20 border-2 border-dashed border-[#134848]'
                          : 'h-2 hover:h-6 hover:bg-[#134848]/10'
                        : 'h-0'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Export modal */}
      {showExport && <ExportModal html={html} onClose={() => setShowExport(false)} />}
    </div>
  )
}
