interface ChurnSparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
}

export function ChurnSparkline({
  values,
  width = 80,
  height = 24,
  color,
}: ChurnSparklineProps) {
  const pad = 2

  // Resolve the stroke color based on trend when no explicit color is given
  function resolveColor(): string {
    if (color) return color
    if (values.length < 2) return '#9ca3af' // gray-400
    const trend = values[values.length - 1] - values[0]
    if (trend < 0) return '#f87171'  // red-400
    if (trend > 0) return '#4ade80'  // green-400
    return '#9ca3af'                 // gray-400
  }

  const stroke = resolveColor()

  // Horizontal midline when not enough data
  if (values.length < 2) {
    const midY = height / 2
    return (
      <svg
        width={width}
        height={height}
        aria-hidden="true"
        className="overflow-visible"
      >
        <line
          x1={pad}
          y1={midY}
          x2={width - pad}
          y2={midY}
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const innerW = width - pad * 2
  const innerH = height - pad * 2

  // Map values to SVG coordinates
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW
    // Invert Y: higher value = lower Y coordinate
    const y = pad + ((maxVal - v) / range) * innerH
    return { x, y }
  })

  const pointsStr = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

  const last = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline
        points={pointsStr}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={2}
        fill={stroke}
      />
    </svg>
  )
}
