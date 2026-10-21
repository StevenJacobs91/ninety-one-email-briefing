import type { ReactNode } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import type { ApprovalStatus } from '../../types/approval.types'
import { useKanban } from '../../contexts/KanbanContext'
import { useApprovals } from '../../contexts/ApprovalsContext'
import { useSettings } from '../../contexts/SettingsContext'
import { ApprovalStatusBadge } from '../approvals/ApprovalStatusBadge'
import { getThemeColours } from '../../lib/themeColours'
import { ageInColumn, formatBoardDate, sendStatus } from '../../lib/boardFormat'
import { fieldsForSurface, groupFields, type BoardSettings } from '../../lib/boardConfig'

export const COLUMN_ORDER: KanbanColumn[] = ['briefed', 'in-progress', 'distributed']
export const COLUMN_LABEL: Record<KanbanColumn, string> = {
  briefed: 'Briefed',
  'in-progress': 'In Progress',
  distributed: 'Distributed',
}

const LABEL = 'text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider'

interface Props {
  card: KanbanCard
  board: BoardSettings
  onView?: (card: KanbanCard) => void
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void
  /** Settings preview: pretend the brief has this approval status */
  approvalOverride?: ApprovalStatus
  /** Settings preview: no quick-move buttons */
  readOnly?: boolean
}

/** A task card showing the fields the board settings ask for, in the order they ask for them. */
export function BoardCard({ card, board, onView, onDragStart, approvalOverride, readOnly }: Props) {
  const { moveCard } = useKanban()
  const { settings } = useSettings()
  const { getApprovalStatusForBrief } = useApprovals()
  const compact = board.density === 'compact'
  const colours = getThemeColours(card.theme)
  const status = sendStatus(card.sendDate, new Date(), card.column)
  const approval = approvalOverride ?? (settings.approvals?.enabled ? getApprovalStatusForBrief(card.briefId) : 'none')
  const comments = card.comments?.length ?? 0

  const colIndex = COLUMN_ORDER.indexOf(card.column)
  const prevCol = colIndex > 0 ? COLUMN_ORDER[colIndex - 1] : null
  const nextCol = colIndex < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[colIndex + 1] : null

  const chip = (id: string): ReactNode => {
    switch (id) {
      case 'urgency':
        return card.urgency === 'urgent' ? <span key={id} className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-medium">Urgent</span> : null
      case 'emailType':
        return <span key={id} className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{card.emailType}</span>
      case 'sendStatus':
        return status === 'overdue'
          ? <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">Overdue</span>
          : status === 'due-soon'
            ? <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Due soon</span>
            : null
      case 'approvalStatus':
        return approval !== 'none' ? <ApprovalStatusBadge key={id} status={approval} size="sm" /> : null
      default:
        return null
    }
  }

  const cell = (id: string): { label: string; value: ReactNode; title?: string } | null => {
    const join = (a: string[]) => (a.length ? a.join(' · ') : '')
    switch (id) {
      case 'submittedBy':
        return card.submittedByName ? { label: 'Submitted by', value: card.submittedByName, title: card.submittedByEmail ? `${card.submittedByName} (${card.submittedByEmail})` : card.submittedByName } : null
      case 'assignee':
        return card.assignee ? { label: 'Assignee', value: card.assignee } : null
      case 'region':
        return card.region.length ? { label: 'Region', value: join(card.region), title: card.region.join(', ') } : null
      case 'channel':
        return card.channel.length ? { label: 'Channel', value: join(card.channel), title: card.channel.join(', ') } : null
      case 'clientGroup':
        return card.clientGroup.length ? { label: 'Client group', value: join(card.clientGroup), title: card.clientGroup.join(', ') } : null
      case 'sendDate':
        return card.sendDate
          ? {
              label: 'Send date',
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === 'overdue' ? 'bg-red-500' : status === 'due-soon' ? 'bg-amber-400' : 'bg-green-500'}`} />
                  <span className={`font-medium ${status === 'overdue' ? 'text-red-600 dark:text-red-400' : status === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : ''}`}>{formatBoardDate(card.sendDate)}</span>
                </span>
              ),
            }
          : null
      case 'contentApprovalDate':
        return card.contentApprovalDate ? { label: 'Content approval', value: formatBoardDate(card.contentApprovalDate) } : null
      case 'startDate':
        return card.startDate ? { label: 'Start date', value: formatBoardDate(card.startDate) } : null
      case 'submittedAt':
        return { label: 'Submitted', value: formatBoardDate(card.submittedAt) }
      case 'tags':
        return card.tags ? { label: 'Tags', value: card.tags, title: card.tags } : null
      default:
        return null
    }
  }

  const block = (id: string): ReactNode => {
    switch (id) {
      case 'theme':
        return (
          <div key={id} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.primary }} title={`Primary: ${colours.primary}`} />
            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colours.accent }} title={`Accent: ${colours.accent}`} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{card.theme}</span>
          </div>
        )
      case 'subjectLine':
        return card.subjectLine ? <p key={id} className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" title={card.subjectLine}>{card.subjectLine}</p> : null
      case 'progress':
        return typeof card.progress === 'number' && card.progress > 0 ? (
          <div key={id}>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div className="h-1 rounded-full bg-brand-primary dark:bg-brand-accent" style={{ width: `${card.progress}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{card.progress}% complete</p>
          </div>
        ) : null
      default:
        return null
    }
  }

  const meta = (id: string): ReactNode => {
    if (id === 'ageInColumn') return <span key={id}>{ageInColumn(card)} in {COLUMN_LABEL[card.column]}</span>
    if (id === 'comments' && comments > 0) return <span key={id} title={`${comments} comment${comments > 1 ? 's' : ''}`}>💬 {comments}</span>
    return null
  }

  const rows = groupFields(fieldsForSurface(board, 'card')).map((g, gi) => {
    if (g.kind === 'chip') {
      const items = g.ids.map(chip).filter(Boolean)
      return items.length ? <div key={gi} className="flex flex-wrap items-center gap-1.5">{items}</div> : null
    }
    if (g.kind === 'cell') {
      const items = g.ids.map((id) => ({ id, c: cell(id) })).filter((x) => x.c)
      return items.length ? (
        <div key={gi} className={`grid ${compact ? 'grid-cols-2 gap-x-2 gap-y-1' : 'grid-cols-2 gap-x-3 gap-y-2'} text-xs`}>
          {items.map(({ id, c }) => (
            <div key={id} className="min-w-0">
              {!compact && <p className={LABEL}>{c!.label}</p>}
              <p className="text-gray-700 dark:text-gray-300 truncate" title={c!.title ?? c!.label}>{c!.value}</p>
            </div>
          ))}
        </div>
      ) : null
    }
    if (g.kind === 'block') {
      const items = g.ids.map(block).filter(Boolean)
      return items.length ? <div key={gi} className="space-y-2">{items}</div> : null
    }
    const items = g.ids.map(meta).filter(Boolean)
    return items.length ? <div key={gi} className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">{items}</div> : null
  }).filter(Boolean)

  const edge =
    board.accent === 'theme' ? { borderLeftColor: colours.primary, borderLeftWidth: 4 }
    : board.accent === 'urgency' ? { borderLeftColor: card.urgency === 'urgent' ? '#dc2626' : '#d1d5db', borderLeftWidth: 4 }
    : undefined

  return (
    <div
      draggable={!readOnly}
      onDragStart={onDragStart ? (e) => onDragStart(e, card.id) : undefined}
      style={edge}
      className={`bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg ${compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2.5'} ${readOnly ? '' : 'cursor-grab active:cursor-grabbing hover:shadow-md'} transition-shadow select-none`}
    >
      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate" title={card.emailName}>{card.emailName}</p>
      {rows}
      {!readOnly && (
        <div className={`flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800 ${compact ? 'pt-2' : 'pt-3'}`}>
          {prevCol && (
            <button type="button" onClick={(e) => { e.stopPropagation(); moveCard(card.id, prevCol) }} aria-label={`Move to ${COLUMN_LABEL[prevCol]}`} title={`Move to ${COLUMN_LABEL[prevCol]}`}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {nextCol && (
            <button type="button" onClick={(e) => { e.stopPropagation(); moveCard(card.id, nextCol) }} aria-label={`Move to ${COLUMN_LABEL[nextCol]}`} title={`Move to ${COLUMN_LABEL[nextCol]}`}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
          {onView && (
            <button type="button" onClick={() => onView(card)} className="ml-auto text-[11px] font-medium text-brand-primary dark:text-brand-accent hover:underline transition-colors px-2 py-1">View</button>
          )}
        </div>
      )}
    </div>
  )
}
