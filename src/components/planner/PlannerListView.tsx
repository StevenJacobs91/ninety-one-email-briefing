import { useState } from 'react'
import type { KanbanCard, KanbanColumn } from '../../types/kanban.types'
import { useKanban } from '../../contexts/KanbanContext'
import { getThemeColours } from '../../lib/themeColours'
import { CampaignCardDetail } from './CampaignCardDetail'

type SortField = 'emailName' | 'emailType' | 'column' | 'sendDate' | 'contentApprovalDate' | 'urgency' | 'assignee' | 'progress'
type SortDir = 'asc' | 'desc'

const COLUMN_LABELS: Record<KanbanColumn, string> = {
  briefed: 'Briefed',
  'in-progress': 'In Progress',
  distributed: 'Distributed',
}

const COLUMN_BADGE: Record<KanbanColumn, string> = {
  briefed: 'bg-brand-primary/10 text-brand-primary dark:bg-brand-accent/10 dark:text-brand-accent',
  'in-progress': 'bg-[#221b3b]/10 text-[#221b3b] dark:bg-[#e8e5ce]/10 dark:text-[#e8e5ce]',
  distributed: 'bg-[#0a3323]/10 text-[#0a3323] dark:bg-green-900/20 dark:text-green-300',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso }
}

function getSendStatus(sendDate: string): 'overdue' | 'due-soon' | 'ok' | 'none' {
  if (!sendDate) return 'none'
  const diff = Math.ceil((new Date(sendDate).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'due-soon'
  return 'ok'
}

interface SortHeaderProps {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (field: SortField) => void
}

function SortHeader({ label, field, current, dir, onSort }: SortHeaderProps) {
  const active = current === field
  return (
    <th
      scope="col"
      className="px-3 py-3 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${active ? 'opacity-100 text-brand-primary dark:text-brand-accent' : 'opacity-30'} ${active && dir === 'desc' ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 3 18 9" />
        </svg>
      </span>
    </th>
  )
}

function sortList(cards: KanbanCard[], field: SortField, dir: SortDir): KanbanCard[] {
  const copy = [...cards]
  const mult = dir === 'asc' ? 1 : -1
  return copy.sort((a, b) => {
    const av = (() => {
      switch (field) {
        case 'emailName': return a.emailName.toLowerCase()
        case 'emailType': return a.emailType
        case 'column': return a.column
        case 'sendDate': return a.sendDate || '9999'
        case 'contentApprovalDate': return a.contentApprovalDate || '9999'
        case 'urgency': return a.urgency
        case 'assignee': return (a.assignee ?? '').toLowerCase()
        case 'progress': return String(a.progress ?? 0).padStart(3, '0')
      }
    })()
    const bv = (() => {
      switch (field) {
        case 'emailName': return b.emailName.toLowerCase()
        case 'emailType': return b.emailType
        case 'column': return b.column
        case 'sendDate': return b.sendDate || '9999'
        case 'contentApprovalDate': return b.contentApprovalDate || '9999'
        case 'urgency': return b.urgency
        case 'assignee': return (b.assignee ?? '').toLowerCase()
        case 'progress': return String(b.progress ?? 0).padStart(3, '0')
      }
    })()
    return av < bv ? -1 * mult : av > bv ? mult : 0
  })
}

interface PlannerListViewProps {
  cards: KanbanCard[]
  search: string
}

export function PlannerListView({ cards, search }: PlannerListViewProps) {
  const { moveCard } = useKanban()
  const [sortField, setSortField] = useState<SortField>('sendDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [filterColumn, setFilterColumn] = useState<KanbanColumn | ''>('')
  const [filterUrgency, setFilterUrgency] = useState<'standard' | 'urgent' | ''>('')

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = cards
    .filter((c) => {
      if (filterColumn && c.column !== filterColumn) return false
      if (filterUrgency && c.urgency !== filterUrgency) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          c.emailName.toLowerCase().includes(q) ||
          c.emailType.toLowerCase().includes(q) ||
          c.tags.toLowerCase().includes(q) ||
          (c.assignee ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })

  const sorted = sortList(filtered, sortField, sortDir)

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 pt-4 pb-2 shrink-0 flex-wrap">
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value as KanbanColumn | '')}
          className="text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
        >
          <option value="">All statuses</option>
          <option value="briefed">Briefed</option>
          <option value="in-progress">In Progress</option>
          <option value="distributed">Distributed</option>
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value as 'standard' | 'urgent' | '')}
          className="text-sm bg-white dark:bg-gray-900 border border-brand-border-warm dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary dark:focus:ring-brand-accent"
        >
          <option value="">All urgency</option>
          <option value="standard">Standard</option>
          <option value="urgent">Urgent</option>
        </select>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{sorted.length} campaign{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-8 overflow-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400 dark:text-gray-500">No campaigns match your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <SortHeader label="Campaign" field="emailName" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Type" field="emailType" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Theme</th>
                <SortHeader label="Status" field="column" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Urgency" field="urgency" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Approval Date" field="contentApprovalDate" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Send Date" field="sendDate" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Assignee" field="assignee" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Progress" field="progress" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                <th scope="col" className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.map((card) => {
                const colours = getThemeColours(card.theme)
                const sendStatus = getSendStatus(card.sendDate)
                const comments = card.comments ?? []
                return (
                  <tr
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="hover:bg-brand-primary/3 dark:hover:bg-brand-accent/5 cursor-pointer transition-colors group"
                  >
                    {/* Campaign name */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">{card.emailName}</p>
                      {comments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          {comments.length}
                        </span>
                      )}
                    </td>
                    {/* Email type */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{card.emailType.replace(/-/g, ' ')}</span>
                    </td>
                    {/* Theme */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colours.primary }} />
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: colours.accent }} />
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${COLUMN_BADGE[card.column]}`}>
                        {COLUMN_LABELS[card.column]}
                      </span>
                    </td>
                    {/* Urgency */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      {card.urgency === 'urgent' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Standard</span>
                      )}
                    </td>
                    {/* Approval date */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(card.contentApprovalDate)}
                    </td>
                    {/* Send date */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {sendStatus !== 'none' && (
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sendStatus === 'overdue' ? 'bg-red-500' : sendStatus === 'due-soon' ? 'bg-amber-400' : 'bg-green-500'}`} />
                        )}
                        <span className={`text-xs font-medium ${sendStatus === 'overdue' ? 'text-red-600 dark:text-red-400' : sendStatus === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {formatDate(card.sendDate)}
                        </span>
                      </div>
                    </td>
                    {/* Assignee */}
                    <td className="px-3 py-3 max-w-[120px]">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">{card.assignee || '—'}</span>
                    </td>
                    {/* Progress */}
                    <td className="px-3 py-3 min-w-[80px]">
                      {typeof card.progress === 'number' ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 min-w-[40px]">
                            <div className="h-1.5 rounded-full bg-brand-primary dark:bg-brand-accent" style={{ width: `${card.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 w-8 text-right">{card.progress}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    {/* Tags */}
                    <td className="px-3 py-3 max-w-[120px]">
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate block">{card.tags || '—'}</span>
                    </td>
                    {/* Quick move */}
                    <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={card.column}
                        onChange={(e) => moveCard(card.id, e.target.value as KanbanColumn)}
                        className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      >
                        <option value="briefed">Briefed</option>
                        <option value="in-progress">In Progress</option>
                        <option value="distributed">Distributed</option>
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedCard && (
        <CampaignCardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  )
}
