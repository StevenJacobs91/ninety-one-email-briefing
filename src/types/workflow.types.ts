import type { ApprovalStageConfig } from './approval.types'

export type WorkflowNodeType = 'start' | 'approval' | 'gateway' | 'end'
export type EdgeCondition = 'approved' | 'rejected' | 'changes_requested' | 'any'

export interface WorkflowNodePosition {
  x: number
  y: number
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: WorkflowNodePosition
  // Only present for 'approval' nodes
  stageConfig?: ApprovalStageConfig
  label?: string
}

export interface WorkflowEdge {
  id: string
  source: string       // node id
  target: string       // node id
  condition: EdgeCondition
  label?: string
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  version: number
}

export type ValidationIssue = {
  type: 'error' | 'warning'
  message: string
  nodeId?: string
}

export type ValidationResult = {
  valid: boolean
  issues: ValidationIssue[]
}
