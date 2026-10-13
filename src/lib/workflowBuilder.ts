import { v4 as uuidv4 } from 'uuid'
import type { ApprovalStageConfig } from '../types/approval.types'
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ValidationResult,
  EdgeCondition,
} from '../types/workflow.types'

// ── Conversion: legacy stages → workflow ───────────────────

export function legacyStagesToWorkflow(stages: ApprovalStageConfig[]): WorkflowDefinition {
  const startNode: WorkflowNode = {
    id: 'start',
    type: 'start',
    position: { x: 80, y: 200 },
    label: 'Start',
  }
  const endNode: WorkflowNode = {
    id: 'end',
    type: 'end',
    position: { x: 80 + (stages.length + 1) * 200, y: 200 },
    label: 'End',
  }

  const approvalNodes: WorkflowNode[] = stages.map((s, i) => ({
    id: uuidv4(),
    type: 'approval' as const,
    position: { x: 80 + (i + 1) * 200, y: 200 },
    stageConfig: { ...s },
    label: s.label || s.role.replace(/_/g, ' '),
  }))

  const allNodes = [startNode, ...approvalNodes, endNode]

  // Chain: start → node1 → node2 → … → end
  const edges: WorkflowEdge[] = []
  for (let i = 0; i < allNodes.length - 1; i++) {
    edges.push({
      id: uuidv4(),
      source: allNodes[i].id,
      target: allNodes[i + 1].id,
      condition: 'approved',
    })
  }

  return { nodes: allNodes, edges, version: 1 }
}

// ── Conversion: workflow → legacy stages ───────────────────

export function workflowToLegacyStages(def: WorkflowDefinition): ApprovalStageConfig[] {
  const approvalNodes = def.nodes
    .filter((n) => n.type === 'approval' && n.stageConfig)
    .map((n) => n.stageConfig!)

  // Re-number stages sequentially
  return approvalNodes.map((s, i) => ({ ...s, stage: i + 1 }))
}

// ── Graph traversal ─────────────────────────────────────────

export function resolveWorkflowToStages(def: WorkflowDefinition): ApprovalStageConfig[] {
  // Simple linear traversal following 'approved' edges from start
  const nodeMap = new Map(def.nodes.map((n) => [n.id, n]))
  const edgesBySource = new Map<string, WorkflowEdge[]>()
  for (const e of def.edges) {
    if (!edgesBySource.has(e.source)) edgesBySource.set(e.source, [])
    edgesBySource.get(e.source)!.push(e)
  }

  const stages: ApprovalStageConfig[] = []
  const visited = new Set<string>()
  let currentId = def.nodes.find((n) => n.type === 'start')?.id

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const node = nodeMap.get(currentId)
    if (!node) break
    if (node.type === 'approval' && node.stageConfig) {
      stages.push({ ...node.stageConfig, stage: stages.length + 1 })
    }
    if (node.type === 'end') break

    // Follow first 'approved' or 'any' edge
    const outEdges = edgesBySource.get(currentId) ?? []
    const next = outEdges.find((e) => e.condition === 'approved' || e.condition === 'any')
    currentId = next?.target
  }

  return stages
}

// ── Validation ──────────────────────────────────────────────

export function validateWorkflow(def: WorkflowDefinition): ValidationResult {
  const issues: ValidationResult['issues'] = []
  const nodeIds = new Set(def.nodes.map((n) => n.id))

  // Must have exactly one start and one end
  const starts = def.nodes.filter((n) => n.type === 'start')
  const ends = def.nodes.filter((n) => n.type === 'end')
  if (starts.length !== 1)
    issues.push({ type: 'error', message: 'Workflow must have exactly one Start node.' })
  if (ends.length !== 1)
    issues.push({ type: 'error', message: 'Workflow must have exactly one End node.' })

  // All edges reference valid nodes
  for (const e of def.edges) {
    if (!nodeIds.has(e.source))
      issues.push({ type: 'error', message: 'Edge references unknown source node.', nodeId: e.source })
    if (!nodeIds.has(e.target))
      issues.push({ type: 'error', message: 'Edge references unknown target node.', nodeId: e.target })
  }

  // Approval nodes must have stageConfig with a role
  for (const n of def.nodes) {
    if (n.type === 'approval' && !n.stageConfig?.role) {
      issues.push({
        type: 'error',
        message: `Approval node "${n.label ?? n.id}" has no role assigned.`,
        nodeId: n.id,
      })
    }
  }

  // Every non-end node must have at least one outgoing edge
  const nodesWithOutEdges = new Set(def.edges.map((e) => e.source))
  for (const n of def.nodes) {
    if (n.type !== 'end' && !nodesWithOutEdges.has(n.id)) {
      issues.push({
        type: 'warning',
        message: `Node "${n.label ?? n.id}" has no outgoing connection.`,
        nodeId: n.id,
      })
    }
  }

  return { valid: issues.filter((i) => i.type === 'error').length === 0, issues }
}

// ── Node factory helpers ────────────────────────────────────

export function createApprovalNode(
  position: { x: number; y: number },
  stageConfig: ApprovalStageConfig
): WorkflowNode {
  return {
    id: uuidv4(),
    type: 'approval',
    position,
    stageConfig,
    label: stageConfig.label || stageConfig.role.replace(/_/g, ' '),
  }
}

export function createEdge(
  source: string,
  target: string,
  condition: EdgeCondition = 'approved'
): WorkflowEdge {
  return { id: uuidv4(), source, target, condition }
}
