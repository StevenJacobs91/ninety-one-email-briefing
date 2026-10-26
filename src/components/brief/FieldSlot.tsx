import type { ReactNode } from 'react'
import { useBriefAttention } from './BriefAttention'

// Past any field's position, so a slot marked `last` sits under all of them.
const LAST = 1000

interface Props {
  /** The field this holds, as in Settings → Form Layout */
  path: string
  /** Always after every field in the section, whatever their order; it still goes when `path` is switched off */
  last?: boolean
  children: ReactNode
}

/**
 * One field of the brief in its place: ordered among its section's fields as Settings has it, and not there at all when
 * it is switched off. Outside the Brief panel it is just the field. A section lays its slots out in a column, so the
 * order is a CSS order and the fields' own code does not move.
 */
export function FieldSlot({ path, last = false, children }: Props) {
  const attention = useBriefAttention()
  if (attention?.hidden.has(path)) return null
  return (
    <div data-brief-field={path} style={{ order: last ? LAST : (attention?.fieldOrder[path] ?? 0) }}>
      {children}
    </div>
  )
}
