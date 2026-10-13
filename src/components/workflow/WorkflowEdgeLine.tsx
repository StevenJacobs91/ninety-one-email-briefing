import type { EdgeCondition } from '../../types/workflow.types'

interface WorkflowEdgeLineProps {
  fromX: number
  fromY: number
  toX: number
  toY: number
  condition: EdgeCondition
  selected?: boolean
  onClick?: () => void
  edgeId: string
}

const CONDITION_STROKE: Record<EdgeCondition, string> = {
  approved:           '#22c55e',
  rejected:           '#ef4444',
  changes_requested:  '#f97316',
  any:                '#94a3b8',
}

const CONDITION_LABEL: Record<EdgeCondition, string> = {
  approved:           'Approved',
  rejected:           'Rejected',
  changes_requested:  'Changes',
  any:                'Any',
}

export function WorkflowEdgeLine({
  fromX,
  fromY,
  toX,
  toY,
  condition,
  selected = false,
  onClick,
  edgeId,
}: WorkflowEdgeLineProps) {
  const stroke = CONDITION_STROKE[condition]
  const strokeWidth = selected ? 2.5 : 1.5
  const markerId = `arrow-${edgeId}`

  // Cubic bezier control points
  const c1x = fromX + 100
  const c1y = fromY
  const c2x = toX - 100
  const c2y = toY

  const d = `M ${fromX},${fromY} C ${c1x},${c1y} ${c2x},${c2y} ${toX},${toY}`

  // Midpoint approximation (t=0.5 on cubic bezier)
  const midX = 0.125 * fromX + 0.375 * c1x + 0.375 * c2x + 0.125 * toX
  const midY = 0.125 * fromY + 0.375 * c1y + 0.375 * c2y + 0.125 * toY

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Edge: ${CONDITION_LABEL[condition]}`}
    >
      {/* Invisible wider hit area for easier clicking */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
      />

      <defs>
        <marker
          id={markerId}
          markerWidth={10}
          markerHeight={7}
          refX={9}
          refY={3.5}
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={stroke}
          />
        </marker>
      </defs>

      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        markerEnd={`url(#${markerId})`}
        strokeDasharray={selected ? '5 3' : undefined}
      />

      {/* Condition label badge rendered as foreignObject */}
      <foreignObject
        x={midX - 32}
        y={midY - 10}
        width={64}
        height={20}
        style={{ pointerEvents: 'none', overflow: 'visible' }}
      >
        <div
          style={{
            backgroundColor: stroke,
            color: '#fff',
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: '10px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            lineHeight: '16px',
          }}
        >
          {CONDITION_LABEL[condition]}
        </div>
      </foreignObject>
    </g>
  )
}
