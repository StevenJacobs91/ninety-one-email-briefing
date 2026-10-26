import type { EmailBuild } from './moduleEngine/build'

/** What undo puts back: the email and the theme it was built in. The rest of the brief is not part of the history. */
export interface Snapshot {
  build: EmailBuild | undefined
  theme: string
}

export interface History {
  past: Snapshot[]
  future: Snapshot[]
  /** The kind of edit last recorded and when, so a run of keystrokes in one place becomes one step */
  lastKey?: string
  lastAt: number
}

export const HISTORY_LIMIT = 50
export const COALESCE_MS = 500

export function emptyHistory(): History {
  return { past: [], future: [], lastAt: 0 }
}

export const canUndo = (h: History) => h.past.length > 0
export const canRedo = (h: History) => h.future.length > 0

/**
 * Notes a change about to be made: `before` is the state it replaces. Edits with the same `key` less than half a second
 * apart count as one step that goes back to the state before the first of them. A new change ends the redo trail.
 */
export function record(h: History, before: Snapshot, key: string | undefined, now: number): History {
  if (key && h.lastKey === key && now - h.lastAt < COALESCE_MS && h.past.length > 0) {
    return { ...h, lastAt: now }
  }
  const past = [...h.past, before].slice(-HISTORY_LIMIT)
  return { past, future: [], lastKey: key, lastAt: now }
}

interface Move {
  history: History
  /** The state to put back, or null when there was nowhere to go */
  snapshot: Snapshot | null
}

export function undo(h: History, current: Snapshot): Move {
  const snapshot = h.past[h.past.length - 1]
  if (!snapshot) return { history: h, snapshot: null }
  return { history: { past: h.past.slice(0, -1), future: [...h.future, current], lastAt: 0 }, snapshot }
}

export function redo(h: History, current: Snapshot): Move {
  const snapshot = h.future[h.future.length - 1]
  if (!snapshot) return { history: h, snapshot: null }
  return { history: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: h.future.slice(0, -1), lastAt: 0 }, snapshot }
}
