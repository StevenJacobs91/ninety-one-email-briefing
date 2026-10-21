const DAY_MS = 24 * 60 * 60 * 1000

export type SendStatus = 'overdue' | 'due-soon' | 'ok'

/** Whether a send date is past, within a week, or fine. A distributed campaign is never flagged. */
export function sendStatus(sendDate: string, now: Date = new Date(), column?: string): SendStatus {
  if (!sendDate || column === 'distributed') return 'ok'
  const diffDays = Math.ceil((new Date(sendDate).getTime() - now.getTime()) / DAY_MS)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due-soon'
  return 'ok'
}

/** How long a card has been in its column, as "3d" or "4h". */
export function ageInColumn(
  card: { columnHistory: { column: string; at: string }[]; submittedAt: string },
  now: Date = new Date(),
): string {
  const last = card.columnHistory[card.columnHistory.length - 1]
  const ageMs = now.getTime() - new Date(last?.at ?? card.submittedAt).getTime()
  const days = Math.floor(ageMs / DAY_MS)
  return days > 0 ? `${days}d` : `${Math.floor(ageMs / (60 * 60 * 1000))}h`
}

export function formatBoardDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
