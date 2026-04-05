import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { useAuditLog } from '../../hooks/useAuditLog'
import { fetchAuditLog, clearAuditLog, type AuditEntry } from '../../lib/auditLog'
import type { AuditCategory, AuditConfig } from '../../types/settings.types'

const CATEGORY_LABELS: Record<AuditCategory, { label: string; description: string }> = {
  auth:     { label: 'Authentication',  description: 'Sign in, sign out, and session events' },
  brief:    { label: 'Briefs',          description: 'Brief creation, submission, and edits' },
  kanban:   { label: 'Kanban Board',    description: 'Card moves, updates, and deletions' },
  draft:    { label: 'Drafts',          description: 'Draft saves, loads, and deletions' },
  settings: { label: 'Settings',        description: 'Configuration and preference changes' },
  user:     { label: 'User Management', description: 'Role changes, member additions/removals' },
  export:   { label: 'Exports',         description: 'Brief exports and clipboard copies' },
}

const ALL_CATEGORIES: AuditCategory[] = ['auth', 'brief', 'kanban', 'draft', 'settings', 'user', 'export']

const PAGE_SIZE = 25

export function TabAuditLog() {
  const { settings, updateSettings } = useSettings()
  const { profile } = useAuth()
  const { log } = useAuditLog()
  const audit = settings.audit

  // Log viewer state
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterCategory, setFilterCategory] = useState<AuditCategory | ''>('')
  const [filterSearch, setFilterSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Clear confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filterSearch), 400)
    return () => clearTimeout(timer)
  }, [filterSearch])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [filterCategory, debouncedSearch])

  // Fetch entries
  const loadEntries = useCallback(async () => {
    if (!profile?.teamId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAuditLog({
        teamId: profile.teamId,
        category: filterCategory || undefined,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setEntries(result.entries)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [profile?.teamId, filterCategory, debouncedSearch, page])

  useEffect(() => {
    if (audit.enabled) {
      loadEntries()
    }
  }, [audit.enabled, loadEntries])

  // Toggle handlers
  const toggleEnabled = () => {
    const next: AuditConfig = { ...audit, enabled: !audit.enabled }
    updateSettings({ audit: next })
    log({
      action: next.enabled ? 'Enabled audit trail' : 'Disabled audit trail',
      category: 'settings',
      entityType: 'audit_config',
    })
  }

  const toggleCategory = (cat: AuditCategory) => {
    const next: AuditConfig = {
      ...audit,
      categories: { ...audit.categories, [cat]: !audit.categories[cat] },
    }
    updateSettings({ audit: next })
  }

  const updateRetention = (days: number) => {
    updateSettings({ audit: { ...audit, retentionDays: days } })
  }

  const handleClear = async () => {
    if (!profile?.teamId) return
    setClearing(true)
    try {
      await clearAuditLog(profile.teamId, audit.retentionDays > 0 ? audit.retentionDays : undefined)
      log({
        action: `Cleared audit log${audit.retentionDays > 0 ? ` (entries older than ${audit.retentionDays} days)` : ' (all entries)'}`,
        category: 'settings',
        entityType: 'audit_log',
      })
      setShowClearConfirm(false)
      loadEntries()
    } catch {
      setError('Failed to clear audit log')
    } finally {
      setClearing(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* ─── Master Toggle ─────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Audit Trail</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Track user actions across the platform. When disabled, no events are recorded.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${
            audit.enabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          role="switch"
          aria-checked={audit.enabled}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
              audit.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* ─── Category Toggles ──────────────────────────────── */}
      <div className={audit.enabled ? '' : 'opacity-50 pointer-events-none'}>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Categories
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const info = CATEGORY_LABELS[cat]
            return (
              <label
                key={cat}
                className="flex items-start gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={audit.categories[cat]}
                  onChange={() => toggleCategory(cat)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/30"
                />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{info.label}</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{info.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* ─── Retention & Clear ─────────────────────────────── */}
      <div className={`flex flex-wrap items-end gap-4 ${audit.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Retention Period
          </label>
          <select
            value={audit.retentionDays}
            onChange={(e) => updateRetention(Number(e.target.value))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          >
            <option value={0}>Keep forever</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-3 py-1.5 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Clear Log
        </button>
      </div>

      {/* ─── Clear Confirmation ────────────────────────────── */}
      {showClearConfirm && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300 mb-3">
            {audit.retentionDays > 0
              ? `This will permanently delete all audit entries older than ${audit.retentionDays} days.`
              : 'This will permanently delete all audit entries.'}
            {' '}This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {clearing ? 'Clearing…' : 'Yes, Clear'}
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Log Viewer ────────────────────────────────────── */}
      {audit.enabled && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Activity Log
            </h4>
            <button
              type="button"
              onClick={loadEntries}
              className="text-[10px] text-brand-primary hover:text-brand-primary/80 font-medium"
            >
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as AuditCategory | '')}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              <option value="">All categories</option>
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat].label}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search actions…"
                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-md pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-xs text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {error}
              <button type="button" onClick={loadEntries} className="ml-2 underline">
                Retry
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10">
              <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">No audit entries found</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                {debouncedSearch || filterCategory ? 'Try adjusting your filters' : 'Events will appear here as users interact with the platform'}
              </p>
            </div>
          ) : (
            <>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Time</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">User</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Action</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatTimestamp(entry.createdAt)}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          <span className="font-medium">{entry.userName}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                          {entry.action}
                        </td>
                        <td className="px-3 py-2">
                          <CategoryBadge category={entry.category} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="text-[10px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="text-[10px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const isThisYear = d.getFullYear() === now.getFullYear()
  const day = d.getDate()
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const time = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (isThisYear) return `${day} ${month}, ${time}`
  return `${day} ${month} ${d.getFullYear()}, ${time}`
}

const CATEGORY_COLOURS: Record<AuditCategory, string> = {
  auth:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  brief:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  kanban:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  draft:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  settings: 'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300',
  user:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  export:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
}

function CategoryBadge({ category }: { category: AuditCategory }) {
  const label = CATEGORY_LABELS[category]?.label ?? category
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLOURS[category] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}
