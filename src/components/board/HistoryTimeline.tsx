import type { KanbanCard } from '../../types/kanban.types'
import { historyEntries } from '../../lib/cardActivity'

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

/** Everything that has happened on the card, oldest first: its moves between stages and every change made to it, and who did each. */
export function HistoryTimeline({ card }: { card: KanbanCard }) {
  const entries = historyEntries(card)
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">History</p>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nothing has happened on this card yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry, i) => (
            <li key={entry.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center shrink-0">
                <span className={`w-2.5 h-2.5 rounded-full mt-0.5 ${entry.kind === 'move' ? 'bg-brand-primary dark:bg-brand-accent' : 'bg-gray-400 dark:bg-gray-500'}`} />
                {i < entries.length - 1 && <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1 mb-0" style={{ minHeight: '16px' }} />}
              </div>
              <div className="min-w-0">
                <p data-title className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.title}</p>
                {entry.detail && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap break-words">{entry.detail}</p>}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{entry.by ? `${entry.by} · ` : ''}{formatDateTime(entry.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
