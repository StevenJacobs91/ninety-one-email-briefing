import { useState } from 'react'
import type { ModuleCategoryConfig } from '../../types/settings.types'
import { FALLBACK_CATEGORY } from '../../lib/moduleCategories'

interface Props {
  categories: ModuleCategoryConfig[]
  /** How many modules are filed under each category, by id */
  counts: Record<string, number>
  onRename: (id: string, label: string) => void
  onAdd: (label: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
}

const ICON = 'p-1 text-gray-400 hover:text-brand-primary dark:hover:text-brand-accent disabled:opacity-30 disabled:hover:text-gray-400'

/**
 * The categories modules are grouped into, here and in the Add module picker. A category can be renamed, moved,
 * added and deleted; its modules go to Other when it is deleted, and Other stays last and cannot be deleted.
 */
export function ModuleCategoryManager({ categories, counts, onRename, onAdd, onMove, onRemove }: Props) {
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const movable = categories.filter((c) => c.id !== FALLBACK_CATEGORY)

  const taken = (label: string, exceptId?: string) => categories.some((c) => c.id !== exceptId && c.label.trim().toLowerCase() === label.trim().toLowerCase())

  const add = () => {
    const label = adding.trim()
    if (!label) { setError('Give the category a name.'); return }
    if (taken(label)) { setError(`There is already a category called "${label}".`); return }
    onAdd(label)
    setAdding('')
    setError('')
  }

  const rename = (c: ModuleCategoryConfig, value: string) => {
    const label = value.trim()
    if (!label || label === c.label) return
    if (taken(label, c.id)) { setError(`There is already a category called "${label}".`); return }
    setError('')
    onRename(c.id, label)
  }

  return (
    <section aria-label="Module categories" className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Categories</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">These are the groups modules are listed under here and in the Add module picker in Layout &amp; Content.</p>

      <ul className="space-y-1">
        {categories.map((c) => {
          const index = movable.findIndex((m) => m.id === c.id)
          const isFallback = c.id === FALLBACK_CATEGORY
          const count = counts[c.id] ?? 0
          return (
            <li key={`${c.id}:${c.label}`} className="flex items-center gap-2">
              <input
                defaultValue={c.label}
                aria-label={`Name of the ${c.label} category`}
                onBlur={(e) => rename(c, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                className="flex-1 min-w-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2.5 py-1 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
              <span className="w-24 text-right text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">{count} {count === 1 ? 'module' : 'modules'}</span>
              {isFallback ? (
                <span className="w-[5.25rem] text-[11px] text-gray-400 dark:text-gray-500" title="Modules with no category, or whose category was deleted, go here">Fallback</span>
              ) : (
                <span className="flex items-center w-[5.25rem]">
                  <button type="button" className={ICON} disabled={index <= 0} onClick={() => onMove(c.id, -1)} aria-label={`Move ${c.label} up`} title="Move up">↑</button>
                  <button type="button" className={ICON} disabled={index === movable.length - 1} onClick={() => onMove(c.id, 1)} aria-label={`Move ${c.label} down`} title="Move down">↓</button>
                  {confirmId === c.id ? null : (
                    <button type="button" className="p-1 text-gray-400 hover:text-red-500" onClick={() => setConfirmId(c.id)} aria-label={`Delete the ${c.label} category`} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </span>
              )}
              {confirmId === c.id && (
                <span role="group" aria-label={`Delete ${c.label}?`} className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{count > 0 ? `${count} to Other.` : ''}</span>
                  <button type="button" onClick={() => { onRemove(c.id); setConfirmId(null) }} className="text-xs font-medium bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700">Delete</button>
                  <button type="button" onClick={() => setConfirmId(null)} className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1.5 py-0.5 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-2 mt-3">
        <input
          value={adding}
          onChange={(e) => { setAdding(e.target.value); setError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="New category name"
          aria-label="New category name"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2.5 py-1 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <button type="button" onClick={add} className="text-xs font-medium text-brand-primary dark:text-brand-accent border border-brand-primary/30 dark:border-brand-accent/30 px-3 py-1.5 rounded-md hover:bg-brand-primary/5">
          Add category
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
    </section>
  )
}
