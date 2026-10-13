import { useEffect, useState, useCallback } from 'react'
import type { WorkflowDefinition, WorkflowNode, ValidationResult } from '../../types/workflow.types'
import type { ApprovalStageConfig } from '../../types/approval.types'
import {
  legacyStagesToWorkflow,
  validateWorkflow,
  createApprovalNode,
  createEdge,
} from '../../lib/workflowBuilder'
import { WorkflowNodeCard } from './WorkflowNodeCard'
import { WorkflowEdgeLine } from './WorkflowEdgeLine'
import { WorkflowAddNodeModal } from './WorkflowAddNodeModal'

interface WorkflowCanvasProps {
  value: WorkflowDefinition
  onChange: (def: WorkflowDefinition) => void
  readOnly?: boolean
}

// Approximate center point of a node for edge routing
function nodeCenter(node: WorkflowNode): { x: number; y: number } {
  if (node.type === 'start' || node.type === 'end' || node.type === 'gateway') {
    return { x: node.position.x + 20, y: node.position.y + 20 }
  }
  // Approval card: w-36 = 144px, approx height 72px
  return { x: node.position.x + 144, y: node.position.y + 36 }
}

function nodeIngressPoint(node: WorkflowNode): { x: number; y: number } {
  if (node.type === 'start' || node.type === 'end' || node.type === 'gateway') {
    return { x: node.position.x + 20, y: node.position.y + 20 }
  }
  return { x: node.position.x, y: node.position.y + 36 }
}

// History entry for undo
interface HistoryEntry {
  nodes: WorkflowDefinition['nodes']
  edges: WorkflowDefinition['edges']
}

const CANVAS_HEIGHT = 360

export function WorkflowCanvas({ value, onChange, readOnly = false }: WorkflowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number }>({ x: 250, y: 160 })
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Initialise with start+end if empty
  useEffect(() => {
    if (value.nodes.length === 0) {
      const initial = legacyStagesToWorkflow([])
      onChange(initial)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Delete selected edge via keyboard
  useEffect(() => {
    if (readOnly) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdgeId) {
          pushHistory()
          onChange({
            ...value,
            edges: value.edges.filter((edge) => edge.id !== selectedEdgeId),
          })
          setSelectedEdgeId(null)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }) // runs every render so `value` is always current — acceptable for a canvas tool

  function pushHistory() {
    setHistory((prev) => [
      ...prev.slice(-19), // keep last 20 states
      { nodes: value.nodes, edges: value.edges },
    ])
  }

  function handleUndo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    onChange({ ...value, nodes: prev.nodes, edges: prev.edges })
  }

  const handleNodeMove = useCallback(
    (id: string, x: number, y: number) => {
      onChange({
        ...value,
        nodes: value.nodes.map((n) =>
          n.id === id ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } } : n
        ),
      })
    },
    [value, onChange]
  )

  function handleNodeDelete(id: string) {
    pushHistory()
    onChange({
      ...value,
      nodes: value.nodes.filter((n) => n.id !== id),
      edges: value.edges.filter((e) => e.source !== id && e.target !== id),
    })
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  function handleConnectStart(fromId: string) {
    setConnectingFromId(fromId)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }

  function handleConnectEnd(toId: string) {
    if (!connectingFromId || connectingFromId === toId) {
      setConnectingFromId(null)
      return
    }
    // Avoid duplicate edges
    const exists = value.edges.some(
      (e) => e.source === connectingFromId && e.target === toId
    )
    if (!exists) {
      pushHistory()
      onChange({
        ...value,
        edges: [...value.edges, createEdge(connectingFromId, toId, 'approved')],
      })
    }
    setConnectingFromId(null)
  }

  function handleAddModalSave(config: ApprovalStageConfig) {
    if (editingNodeId) {
      // Edit existing node
      pushHistory()
      onChange({
        ...value,
        nodes: value.nodes.map((n) =>
          n.id === editingNodeId
            ? {
                ...n,
                stageConfig: config,
                label: config.label || config.role.replace(/_/g, ' '),
              }
            : n
        ),
      })
    } else {
      // Add new node
      pushHistory()
      const newNode = createApprovalNode(pendingPosition, config)
      onChange({ ...value, nodes: [...value.nodes, newNode] })
    }
    setShowAddModal(false)
    setEditingNodeId(null)
  }

  function handleOpenEdit(nodeId: string) {
    setEditingNodeId(nodeId)
    setShowAddModal(true)
  }

  function handleValidate() {
    setValidationResult(validateWorkflow(value))
  }

  function handleClear() {
    if (readOnly) return
    pushHistory()
    const fresh = legacyStagesToWorkflow([])
    onChange(fresh)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setValidationResult(null)
  }

  const editingNode = editingNodeId
    ? value.nodes.find((n) => n.id === editingNodeId)
    : undefined

  const canvasWidth = Math.max(
    600,
    ...value.nodes.map((n) => n.position.x + 200)
  )

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              // Place new node after the last approval node (or at default)
              const approvalNodes = value.nodes.filter((n) => n.type === 'approval')
              const lastX =
                approvalNodes.length > 0
                  ? Math.max(...approvalNodes.map((n) => n.position.x)) + 200
                  : 280
              const endNode = value.nodes.find((n) => n.type === 'end')
              const safeX = endNode ? Math.min(lastX, endNode.position.x - 200) : lastX
              setPendingPosition({ x: Math.max(280, safeX), y: 160 })
              setEditingNodeId(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-1.5 bg-brand-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand-primary-hover transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Add Approval Stage
          </button>

          <button
            type="button"
            onClick={handleValidate}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Validate
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>

          {connectingFromId && (
            <span className="ml-auto text-xs text-brand-primary dark:text-brand-accent animate-pulse">
              Click a node to connect…
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => setConnectingFromId(null)}
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        className="relative overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
        style={{ minHeight: CANVAS_HEIGHT }}
        onClick={() => {
          if (!connectingFromId) {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
          }
        }}
      >
        {/* SVG layer for edges */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: canvasWidth,
            height: CANVAS_HEIGHT,
            pointerEvents: connectingFromId ? 'all' : 'none',
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          {value.edges.map((edge) => {
            const sourceNode = value.nodes.find((n) => n.id === edge.source)
            const targetNode = value.nodes.find((n) => n.id === edge.target)
            if (!sourceNode || !targetNode) return null

            const from = nodeCenter(sourceNode)
            const to = nodeIngressPoint(targetNode)

            return (
              <WorkflowEdgeLine
                key={edge.id}
                edgeId={edge.id}
                fromX={from.x}
                fromY={from.y}
                toX={to.x}
                toY={to.y}
                condition={edge.condition}
                selected={selectedEdgeId === edge.id}
                onClick={
                  readOnly
                    ? undefined
                    : () => {
                        setSelectedEdgeId(edge.id)
                        setSelectedNodeId(null)
                      }
                }
              />
            )
          })}
        </svg>

        {/* Node layer */}
        <div
          style={{
            position: 'relative',
            width: canvasWidth,
            height: CANVAS_HEIGHT,
            zIndex: 1,
          }}
        >
          {value.nodes.map((node) => (
            <WorkflowNodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={() => {
                setSelectedNodeId(node.id)
                setSelectedEdgeId(null)
              }}
              onMove={readOnly ? () => undefined : handleNodeMove}
              onEdit={
                node.type === 'approval' && !readOnly
                  ? () => handleOpenEdit(node.id)
                  : undefined
              }
              onDelete={
                node.type !== 'start' && node.type !== 'end' && !readOnly
                  ? () => handleNodeDelete(node.id)
                  : undefined
              }
              isConnecting={connectingFromId !== null}
              onConnectStart={
                !readOnly && node.type !== 'end'
                  ? () => handleConnectStart(node.id)
                  : undefined
              }
              onConnectEnd={
                !readOnly && connectingFromId !== null && connectingFromId !== node.id
                  ? () => handleConnectEnd(node.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Validation results */}
      {validationResult && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            validationResult.valid
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
          }`}
        >
          {validationResult.valid ? (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Workflow is valid
            </div>
          ) : (
            <ul className="space-y-1">
              {validationResult.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  {issue.type === 'error' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4v3.5M7 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" aria-hidden="true">
                      <path d="M7 2L13 12H1L7 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M7 6v2.5M7 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                  <span
                    className={
                      issue.type === 'error'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }
                  >
                    {issue.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Add / Edit modal */}
      {showAddModal && (
        <WorkflowAddNodeModal
          mode={editingNodeId ? 'edit' : 'add'}
          initial={editingNode?.stageConfig}
          onSave={handleAddModalSave}
          onClose={() => {
            setShowAddModal(false)
            setEditingNodeId(null)
          }}
        />
      )}
    </div>
  )
}
